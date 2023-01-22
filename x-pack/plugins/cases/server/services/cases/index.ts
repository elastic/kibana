/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  SavedObjectsBulkResponse,
  SavedObjectsFindResult,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsUpdateResponse,
  SavedObjectsResolveResponse,
  SavedObjectsFindOptions,
  SavedObjectsBulkDeleteObject,
  SavedObjectsBulkDeleteOptions,
} from '@kbn/core/server';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder } from '@kbn/es-query';

import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
} from '../../../common/constants';
import type {
  CaseResponse,
  CasesFindRequest,
  CommentAttributes,
  User,
  CaseAttributes,
  CaseStatuses,
} from '../../../common/api';
import { caseStatuses } from '../../../common/api';
import type { CaseSavedObject, SavedObjectFindOptionsKueryNode } from '../../common/types';
import { defaultSortField, flattenCaseSavedObject } from '../../common/utils';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from '../../routes/api';
import { combineFilters } from '../../client/utils';
import { includeFieldsRequiredForAuthentication } from '../../authorization/utils';
import {
  transformSavedObjectToExternalModel,
  transformAttributesToESModel,
  transformUpdateResponseToExternalModel,
  transformUpdateResponsesToExternalModels,
  transformBulkResponseToExternalModel,
  transformFindResponseToExternalModel,
} from './transform';
import type { ESCaseAttributes } from './types';
import { ESCaseStatus } from './types';
import type { AttachmentService } from '../attachments';
import type { AggregationBuilder, AggregationResponse } from '../../client/metrics/types';
import { createCaseError } from '../../common/error';
import type { IndexRefresh } from '../types';

interface GetCaseIdsByAlertIdArgs {
  alertId: string;
  filter?: KueryNode;
}

interface PushedArgs {
  pushed_at: string;
  pushed_by: User;
}

interface GetCaseArgs {
  id: string;
}

interface DeleteCaseArgs extends GetCaseArgs, IndexRefresh {}

interface GetCasesArgs {
  caseIds: string[];
  fields?: string[];
}

interface FindCommentsArgs {
  id: string | string[];
  options?: SavedObjectFindOptionsKueryNode;
}

interface FindCaseCommentsArgs {
  id: string | string[];
  options?: SavedObjectFindOptionsKueryNode;
}

interface PostCaseArgs extends IndexRefresh {
  attributes: CaseAttributes;
  id: string;
}

interface PatchCase extends IndexRefresh {
  caseId: string;
  updatedAttributes: Partial<CaseAttributes & PushedArgs>;
  originalCase: CaseSavedObject;
  version?: string;
}
type PatchCaseArgs = PatchCase;

interface PatchCasesArgs extends IndexRefresh {
  cases: Array<Omit<PatchCase, 'refresh'>>;
}

interface CasesMapWithPageInfo {
  casesMap: Map<string, CaseResponse>;
  page: number;
  perPage: number;
  total: number;
}

type FindCaseOptions = CasesFindRequest & SavedObjectFindOptionsKueryNode;

interface GetTagsArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  filter?: KueryNode;
}

interface GetReportersArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  filter?: KueryNode;
}

interface GetCaseIdsByAlertIdAggs {
  references: {
    doc_count: number;
    caseIds: {
      buckets: Array<{ key: string }>;
    };
  };
}

export class CasesService {
  private readonly log: Logger;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private readonly attachmentService: AttachmentService;

  constructor({
    log,
    unsecuredSavedObjectsClient,
    attachmentService,
  }: {
    log: Logger;
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    attachmentService: AttachmentService;
  }) {
    this.log = log;
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.attachmentService = attachmentService;
  }

  private buildCaseIdsAggs = (
    size: number = 100
  ): Record<string, estypes.AggregationsAggregationContainer> => ({
    references: {
      nested: {
        path: `${CASE_COMMENT_SAVED_OBJECT}.references`,
      },
      aggregations: {
        caseIds: {
          terms: {
            field: `${CASE_COMMENT_SAVED_OBJECT}.references.id`,
            size,
          },
        },
      },
    },
  });

  public async getCaseIdsByAlertId({
    alertId,
    filter,
  }: GetCaseIdsByAlertIdArgs): Promise<
    SavedObjectsFindResponse<CommentAttributes, GetCaseIdsByAlertIdAggs>
  > {
    try {
      this.log.debug(`Attempting to GET all cases for alert id ${alertId}`);
      const combinedFilter = combineFilters([
        nodeBuilder.is(`${CASE_COMMENT_SAVED_OBJECT}.attributes.alertId`, alertId),
        filter,
      ]);

      const response = await this.unsecuredSavedObjectsClient.find<
        CommentAttributes,
        GetCaseIdsByAlertIdAggs
      >({
        type: CASE_COMMENT_SAVED_OBJECT,
        fields: includeFieldsRequiredForAuthentication(),
        page: 1,
        perPage: 1,
        sortField: defaultSortField,
        aggs: this.buildCaseIdsAggs(MAX_DOCS_PER_PAGE),
        filter: combinedFilter,
      });
      return response;
    } catch (error) {
      this.log.error(`Error on GET all cases for alert id ${alertId}: ${error}`);
      throw error;
    }
  }

  /**
   * Extracts the case IDs from the alert aggregation
   */
  public static getCaseIDsFromAlertAggs(
    result: SavedObjectsFindResponse<CommentAttributes, GetCaseIdsByAlertIdAggs>
  ): string[] {
    return result.aggregations?.references.caseIds.buckets.map((b) => b.key) ?? [];
  }

  /**
   * Returns a map of all cases.
   */
  public async findCasesGroupedByID({
    caseOptions,
  }: {
    caseOptions: FindCaseOptions;
  }): Promise<CasesMapWithPageInfo> {
    const cases = await this.findCases(caseOptions);

    const casesMap = cases.saved_objects.reduce((accMap, caseInfo) => {
      accMap.set(caseInfo.id, caseInfo);
      return accMap;
    }, new Map<string, SavedObjectsFindResult<CaseAttributes>>());

    const commentTotals = await this.attachmentService.getCaseCommentStats({
      unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
      caseIds: Array.from(casesMap.keys()),
    });

    const casesWithComments = new Map<string, CaseResponse>();
    for (const [id, caseInfo] of casesMap.entries()) {
      const { alerts, userComments } = commentTotals.get(id) ?? { alerts: 0, userComments: 0 };

      casesWithComments.set(
        id,
        flattenCaseSavedObject({
          savedObject: caseInfo,
          totalComment: userComments,
          totalAlerts: alerts,
        })
      );
    }

    return {
      casesMap: casesWithComments,
      page: cases.page,
      perPage: cases.per_page,
      total: cases.total,
    };
  }

  public async getCaseStatusStats({
    searchOptions,
  }: {
    searchOptions: SavedObjectFindOptionsKueryNode;
  }): Promise<{
    [status in CaseStatuses]: number;
  }> {
    const cases = await this.unsecuredSavedObjectsClient.find<
      ESCaseAttributes,
      {
        statuses: {
          buckets: Array<{
            key: string;
            doc_count: number;
          }>;
        };
      }
    >({
      ...searchOptions,
      type: CASE_SAVED_OBJECT,
      perPage: 0,
      aggs: {
        statuses: {
          terms: {
            field: `${CASE_SAVED_OBJECT}.attributes.status`,
            size: caseStatuses.length,
            order: { _key: 'asc' },
          },
        },
      },
    });

    const statusBuckets = CasesService.getStatusBuckets(cases.aggregations?.statuses.buckets);
    return {
      open: statusBuckets?.get(ESCaseStatus.OPEN) ?? 0,
      'in-progress': statusBuckets?.get(ESCaseStatus.IN_PROGRESS) ?? 0,
      closed: statusBuckets?.get(ESCaseStatus.CLOSED) ?? 0,
    };
  }

  private static getStatusBuckets(
    buckets: Array<{ key: string; doc_count: number }> | undefined
  ): Map<number, number> | undefined {
    return buckets?.reduce((acc, bucket) => {
      acc.set(Number(bucket.key), bucket.doc_count);
      return acc;
    }, new Map<number, number>());
  }

  public async deleteCase({ id: caseId, refresh }: DeleteCaseArgs) {
    try {
      this.log.debug(`Attempting to DELETE case ${caseId}`);
      return await this.unsecuredSavedObjectsClient.delete(CASE_SAVED_OBJECT, caseId, { refresh });
    } catch (error) {
      this.log.error(`Error on DELETE case ${caseId}: ${error}`);
      throw error;
    }
  }

  public async bulkDeleteCaseEntities({
    entities,
    options,
  }: {
    entities: SavedObjectsBulkDeleteObject[];
    options?: SavedObjectsBulkDeleteOptions;
  }) {
    try {
      this.log.debug(`Attempting to bulk delete case entities ${JSON.stringify(entities)}`);
      return await this.unsecuredSavedObjectsClient.bulkDelete(entities, options);
    } catch (error) {
      this.log.error(`Error bulk deleting case entities ${JSON.stringify(entities)}: ${error}`);
    }
  }

  public async getCase({ id: caseId }: GetCaseArgs): Promise<CaseSavedObject> {
    try {
      this.log.debug(`Attempting to GET case ${caseId}`);
      const caseSavedObject = await this.unsecuredSavedObjectsClient.get<ESCaseAttributes>(
        CASE_SAVED_OBJECT,
        caseId
      );
      return transformSavedObjectToExternalModel(caseSavedObject);
    } catch (error) {
      this.log.error(`Error on GET case ${caseId}: ${error}`);
      throw error;
    }
  }

  public async getResolveCase({
    id: caseId,
  }: GetCaseArgs): Promise<SavedObjectsResolveResponse<CaseAttributes>> {
    try {
      this.log.debug(`Attempting to resolve case ${caseId}`);
      const resolveCaseResult = await this.unsecuredSavedObjectsClient.resolve<ESCaseAttributes>(
        CASE_SAVED_OBJECT,
        caseId
      );
      return {
        ...resolveCaseResult,
        saved_object: transformSavedObjectToExternalModel(resolveCaseResult.saved_object),
      };
    } catch (error) {
      this.log.error(`Error on resolve case ${caseId}: ${error}`);
      throw error;
    }
  }

  public async getCases({
    caseIds,
    fields,
  }: GetCasesArgs): Promise<SavedObjectsBulkResponse<CaseAttributes>> {
    try {
      this.log.debug(`Attempting to GET cases ${caseIds.join(', ')}`);
      const cases = await this.unsecuredSavedObjectsClient.bulkGet<ESCaseAttributes>(
        caseIds.map((caseId) => ({ type: CASE_SAVED_OBJECT, id: caseId, fields }))
      );
      return transformBulkResponseToExternalModel(cases);
    } catch (error) {
      this.log.error(`Error on GET cases ${caseIds.join(', ')}: ${error}`);
      throw error;
    }
  }

  public async findCases(
    options?: SavedObjectFindOptionsKueryNode
  ): Promise<SavedObjectsFindResponse<CaseAttributes>> {
    try {
      this.log.debug(`Attempting to find cases`);
      const cases = await this.unsecuredSavedObjectsClient.find<ESCaseAttributes>({
        sortField: defaultSortField,
        ...options,
        type: CASE_SAVED_OBJECT,
      });
      return transformFindResponseToExternalModel(cases);
    } catch (error) {
      this.log.error(`Error on find cases: ${error}`);
      throw error;
    }
  }

  private asArray(id: string | string[] | undefined): string[] {
    if (id === undefined) {
      return [];
    } else if (Array.isArray(id)) {
      return id;
    } else {
      return [id];
    }
  }

  private async getAllComments({
    id,
    options,
  }: FindCommentsArgs): Promise<SavedObjectsFindResponse<CommentAttributes>> {
    try {
      this.log.debug(`Attempting to GET all comments internal for id ${JSON.stringify(id)}`);
      if (options?.page !== undefined || options?.perPage !== undefined) {
        return this.attachmentService.find({
          unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
          options: {
            sortField: defaultSortField,
            ...options,
          },
        });
      }

      return this.attachmentService.find({
        unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
        options: {
          page: 1,
          perPage: MAX_DOCS_PER_PAGE,
          sortField: defaultSortField,
          ...options,
        },
      });
    } catch (error) {
      this.log.error(`Error on GET all comments internal for ${JSON.stringify(id)}: ${error}`);
      throw error;
    }
  }

  /**
   * Default behavior is to retrieve all comments that adhere to a given filter (if one is included).
   * to override this pass in the either the page or perPage options.
   */
  public async getAllCaseComments({
    id,
    options,
  }: FindCaseCommentsArgs): Promise<SavedObjectsFindResponse<CommentAttributes>> {
    try {
      const refs = this.asArray(id).map((caseID) => ({ type: CASE_SAVED_OBJECT, id: caseID }));
      if (refs.length <= 0) {
        return {
          saved_objects: [],
          total: 0,
          per_page: options?.perPage ?? DEFAULT_PER_PAGE,
          page: options?.page ?? DEFAULT_PAGE,
        };
      }

      this.log.debug(`Attempting to GET all comments for case caseID ${JSON.stringify(id)}`);
      return await this.getAllComments({
        id,
        options: {
          hasReferenceOperator: 'OR',
          hasReference: refs,
          filter: options?.filter,
          ...options,
        },
      });
    } catch (error) {
      this.log.error(`Error on GET all comments for case ${JSON.stringify(id)}: ${error}`);
      throw error;
    }
  }

  public async getReporters({ filter }: GetReportersArgs): Promise<User[]> {
    try {
      this.log.debug(`Attempting to GET all reporters`);

      const results = await this.unsecuredSavedObjectsClient.find<
        ESCaseAttributes,
        {
          reporters: {
            buckets: Array<{
              key: string;
              top_docs: { hits: { hits: Array<{ _source: { cases: { created_by: User } } }> } };
            }>;
          };
        }
      >({
        type: CASE_SAVED_OBJECT,
        page: 1,
        perPage: 1,
        filter,
        aggs: {
          reporters: {
            terms: {
              field: `${CASE_SAVED_OBJECT}.attributes.created_by.username`,
              size: MAX_DOCS_PER_PAGE,
              order: { _key: 'asc' },
            },
            aggs: {
              top_docs: {
                top_hits: {
                  sort: [
                    {
                      [`${CASE_SAVED_OBJECT}.created_at`]: {
                        order: 'desc',
                      },
                    },
                  ],
                  size: 1,
                  _source: [`${CASE_SAVED_OBJECT}.created_by`],
                },
              },
            },
          },
        },
      });

      return (
        results?.aggregations?.reporters?.buckets.map(({ key: username, top_docs: topDocs }) => {
          const user = topDocs?.hits?.hits?.[0]?._source?.cases?.created_by ?? {};
          return {
            username,
            full_name: user.full_name ?? null,
            email: user.email ?? null,
            // TODO: verify that adding a new field is ok, shouldn't be a breaking change
            profile_uid: user.profile_uid,
          };
        }) ?? []
      );
    } catch (error) {
      this.log.error(`Error on GET all reporters: ${error}`);
      throw error;
    }
  }

  public async getTags({ filter }: GetTagsArgs): Promise<string[]> {
    try {
      this.log.debug(`Attempting to GET all cases`);

      const results = await this.unsecuredSavedObjectsClient.find<
        ESCaseAttributes,
        { tags: { buckets: Array<{ key: string }> } }
      >({
        type: CASE_SAVED_OBJECT,
        page: 1,
        perPage: 1,
        filter,
        aggs: {
          tags: {
            terms: {
              field: `${CASE_SAVED_OBJECT}.attributes.tags`,
              size: MAX_DOCS_PER_PAGE,
              order: { _key: 'asc' },
            },
          },
        },
      });

      return results?.aggregations?.tags?.buckets.map(({ key }) => key) ?? [];
    } catch (error) {
      this.log.error(`Error on GET tags: ${error}`);
      throw error;
    }
  }

  public async postNewCase({ attributes, id, refresh }: PostCaseArgs): Promise<CaseSavedObject> {
    try {
      this.log.debug(`Attempting to POST a new case`);
      const transformedAttributes = transformAttributesToESModel(attributes);

      transformedAttributes.attributes.total_alerts = -1;
      transformedAttributes.attributes.total_comments = -1;

      const createdCase = await this.unsecuredSavedObjectsClient.create<ESCaseAttributes>(
        CASE_SAVED_OBJECT,
        transformedAttributes.attributes,
        { id, references: transformedAttributes.referenceHandler.build(), refresh }
      );

      return transformSavedObjectToExternalModel(createdCase);
    } catch (error) {
      this.log.error(`Error on POST a new case: ${error}`);
      throw error;
    }
  }

  public async patchCase({
    caseId,
    updatedAttributes,
    originalCase,
    version,
    refresh,
  }: PatchCaseArgs): Promise<SavedObjectsUpdateResponse<CaseAttributes>> {
    try {
      this.log.debug(`Attempting to UPDATE case ${caseId}`);
      const transformedAttributes = transformAttributesToESModel(updatedAttributes);

      const updatedCase = await this.unsecuredSavedObjectsClient.update<ESCaseAttributes>(
        CASE_SAVED_OBJECT,
        caseId,
        transformedAttributes.attributes,
        {
          version,
          references: transformedAttributes.referenceHandler.build(originalCase.references),
          refresh,
        }
      );

      return transformUpdateResponseToExternalModel(updatedCase);
    } catch (error) {
      this.log.error(`Error on UPDATE case ${caseId}: ${error}`);
      throw error;
    }
  }

  public async patchCases({
    cases,
    refresh,
  }: PatchCasesArgs): Promise<SavedObjectsBulkUpdateResponse<CaseAttributes>> {
    try {
      this.log.debug(`Attempting to UPDATE case ${cases.map((c) => c.caseId).join(', ')}`);

      const bulkUpdate = cases.map(({ caseId, updatedAttributes, version, originalCase }) => {
        const { attributes, referenceHandler } = transformAttributesToESModel(updatedAttributes);
        return {
          type: CASE_SAVED_OBJECT,
          id: caseId,
          attributes,
          references: referenceHandler.build(originalCase.references),
          version,
        };
      });

      const updatedCases = await this.unsecuredSavedObjectsClient.bulkUpdate<ESCaseAttributes>(
        bulkUpdate,
        { refresh }
      );

      return transformUpdateResponsesToExternalModels(updatedCases);
    } catch (error) {
      this.log.error(`Error on UPDATE case ${cases.map((c) => c.caseId).join(', ')}: ${error}`);
      throw error;
    }
  }

  public async executeAggregations({
    aggregationBuilders,
    options,
  }: {
    aggregationBuilders: Array<AggregationBuilder<unknown>>;
    options?: Omit<SavedObjectsFindOptions, 'aggs' | 'type'>;
  }): Promise<AggregationResponse> {
    try {
      const builtAggs = aggregationBuilders.reduce((acc, agg) => {
        return { ...acc, ...agg.build() };
      }, {});

      const res = await this.unsecuredSavedObjectsClient.find<
        ESCaseAttributes,
        AggregationResponse
      >({
        sortField: defaultSortField,
        ...options,
        aggs: builtAggs,
        type: CASE_SAVED_OBJECT,
      });

      return res.aggregations;
    } catch (error) {
      const aggregationNames = aggregationBuilders.map((agg) => agg.getName());

      throw createCaseError({
        message: `Failed to execute aggregations [${aggregationNames.join(',')}]: ${error}`,
        error,
        logger: this.log,
      });
    }
  }
}
