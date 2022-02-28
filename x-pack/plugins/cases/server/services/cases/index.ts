/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaRequest,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  SavedObjectsBulkResponse,
  SavedObjectsFindResult,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsUpdateResponse,
  SavedObjectsResolveResponse,
} from 'kibana/server';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { nodeBuilder, KueryNode } from '@kbn/es-query';

import { SecurityPluginSetup } from '../../../../security/server';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
} from '../../../common/constants';
import {
  GetCaseIdsByAlertIdAggs,
  CaseResponse,
  CasesFindRequest,
  CommentAttributes,
  User,
  CaseAttributes,
  CaseStatuses,
  caseStatuses,
} from '../../../common/api';
import { SavedObjectFindOptionsKueryNode } from '../../common/types';
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
import { ESCaseAttributes } from './types';
import { AttachmentService } from '../attachments';

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

interface GetCasesArgs {
  caseIds: string[];
}

interface FindCommentsArgs {
  id: string | string[];
  options?: SavedObjectFindOptionsKueryNode;
}

interface FindCaseCommentsArgs {
  id: string | string[];
  options?: SavedObjectFindOptionsKueryNode;
}

interface PostCaseArgs {
  attributes: CaseAttributes;
  id: string;
}

interface PatchCase {
  caseId: string;
  updatedAttributes: Partial<CaseAttributes & PushedArgs>;
  originalCase: SavedObject<CaseAttributes>;
  version?: string;
}
type PatchCaseArgs = PatchCase;

interface PatchCasesArgs {
  cases: PatchCase[];
}

interface GetUserArgs {
  request: KibanaRequest;
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

export class CasesService {
  private readonly log: Logger;
  private readonly authentication?: SecurityPluginSetup['authc'];
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private readonly attachmentService: AttachmentService;

  constructor({
    log,
    authentication,
    unsecuredSavedObjectsClient,
    attachmentService,
  }: {
    log: Logger;
    authentication?: SecurityPluginSetup['authc'];
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    attachmentService: AttachmentService;
  }) {
    this.log = log;
    this.authentication = authentication;
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
      const { alerts, nonAlerts } = commentTotals.get(id) ?? { alerts: 0, nonAlerts: 0 };

      casesWithComments.set(
        id,
        flattenCaseSavedObject({
          savedObject: caseInfo,
          totalComment: nonAlerts,
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
      open: statusBuckets?.get('open') ?? 0,
      'in-progress': statusBuckets?.get('in-progress') ?? 0,
      closed: statusBuckets?.get('closed') ?? 0,
    };
  }

  private static getStatusBuckets(
    buckets: Array<{ key: string; doc_count: number }> | undefined
  ): Map<string, number> | undefined {
    return buckets?.reduce((acc, bucket) => {
      acc.set(bucket.key, bucket.doc_count);
      return acc;
    }, new Map<string, number>());
  }

  public async deleteCase({ id: caseId }: GetCaseArgs) {
    try {
      this.log.debug(`Attempting to DELETE case ${caseId}`);
      return await this.unsecuredSavedObjectsClient.delete(CASE_SAVED_OBJECT, caseId);
    } catch (error) {
      this.log.error(`Error on DELETE case ${caseId}: ${error}`);
      throw error;
    }
  }

  public async getCase({ id: caseId }: GetCaseArgs): Promise<SavedObject<CaseAttributes>> {
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
  }: GetCasesArgs): Promise<SavedObjectsBulkResponse<CaseAttributes>> {
    try {
      this.log.debug(`Attempting to GET cases ${caseIds.join(', ')}`);
      const cases = await this.unsecuredSavedObjectsClient.bulkGet<ESCaseAttributes>(
        caseIds.map((caseId) => ({ type: CASE_SAVED_OBJECT, id: caseId }))
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
        return this.unsecuredSavedObjectsClient.find<CommentAttributes>({
          type: CASE_COMMENT_SAVED_OBJECT,
          sortField: defaultSortField,
          ...options,
        });
      }

      return this.unsecuredSavedObjectsClient.find<CommentAttributes>({
        type: CASE_COMMENT_SAVED_OBJECT,
        page: 1,
        perPage: MAX_DOCS_PER_PAGE,
        sortField: defaultSortField,
        ...options,
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

  public getUser({ request }: GetUserArgs) {
    try {
      this.log.debug(`Attempting to authenticate a user`);
      if (this.authentication != null) {
        const user = this.authentication.getCurrentUser(request);
        if (!user) {
          return {
            username: null,
            full_name: null,
            email: null,
          };
        }
        return user;
      }
      return {
        username: null,
        full_name: null,
        email: null,
      };
    } catch (error) {
      this.log.error(`Error on GET user: ${error}`);
      throw error;
    }
  }

  public async postNewCase({ attributes, id }: PostCaseArgs): Promise<SavedObject<CaseAttributes>> {
    try {
      this.log.debug(`Attempting to POST a new case`);
      const transformedAttributes = transformAttributesToESModel(attributes);
      const createdCase = await this.unsecuredSavedObjectsClient.create<ESCaseAttributes>(
        CASE_SAVED_OBJECT,
        transformedAttributes.attributes,
        { id, references: transformedAttributes.referenceHandler.build() }
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
        bulkUpdate
      );
      return transformUpdateResponsesToExternalModels(updatedCases);
    } catch (error) {
      this.log.error(`Error on UPDATE case ${cases.map((c) => c.caseId).join(', ')}: ${error}`);
      throw error;
    }
  }
}
