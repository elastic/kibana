/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
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
  MAX_CONCURRENT_SEARCHES,
  MAX_DOCS_PER_PAGE,
} from '../../../common/constants';
import {
  GetCaseIdsByAlertIdAggs,
  CaseResponse,
  CasesFindRequest,
  CommentAttributes,
  CommentType,
  User,
  CaseAttributes,
} from '../../../common/api';
import { SavedObjectFindOptionsKueryNode } from '../../common/types';
import { defaultSortField, flattenCaseSavedObject, groupTotalAlertsByID } from '../../common/utils';
import { defaultPage, defaultPerPage } from '../../routes/api';
import { ClientArgs } from '..';
import { combineFilters } from '../../client/utils';
import { includeFieldsRequiredForAuthentication } from '../../authorization/utils';
import { EnsureSOAuthCallback } from '../../authorization';
import {
  transformSavedObjectToExternalModel,
  transformAttributesToESModel,
  transformUpdateResponseToExternalModel,
  transformUpdateResponsesToExternalModels,
  transformBulkResponseToExternalModel,
  transformFindResponseToExternalModel,
} from './transform';
import { ESCaseAttributes } from './types';

interface GetCaseIdsByAlertIdArgs extends ClientArgs {
  alertId: string;
  filter?: KueryNode;
}

interface PushedArgs {
  pushed_at: string;
  pushed_by: User;
}

interface GetCaseArgs extends ClientArgs {
  id: string;
}

interface GetCasesArgs extends ClientArgs {
  caseIds: string[];
}

interface FindCommentsArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  id: string | string[];
  options?: SavedObjectFindOptionsKueryNode;
}

interface FindCaseCommentsArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  id: string | string[];
  options?: SavedObjectFindOptionsKueryNode;
}

interface FindCasesArgs extends ClientArgs {
  options?: SavedObjectFindOptionsKueryNode;
}

interface PostCaseArgs extends ClientArgs {
  attributes: CaseAttributes;
  id: string;
}

interface PatchCase {
  caseId: string;
  updatedAttributes: Partial<CaseAttributes & PushedArgs>;
  originalCase: SavedObject<CaseAttributes>;
  version?: string;
}
type PatchCaseArgs = PatchCase & ClientArgs;

interface PatchCasesArgs extends ClientArgs {
  cases: PatchCase[];
}

interface GetUserArgs {
  request: KibanaRequest;
}

interface CaseCommentStats {
  commentTotals: Map<string, number>;
  alertTotals: Map<string, number>;
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
  constructor(
    private readonly log: Logger,
    private readonly authentication?: SecurityPluginSetup['authc']
  ) {}

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
    unsecuredSavedObjectsClient,
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

      const response = await unsecuredSavedObjectsClient.find<
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
    unsecuredSavedObjectsClient,
    caseOptions,
  }: {
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    caseOptions: FindCaseOptions;
  }): Promise<CasesMapWithPageInfo> {
    const cases = await this.findCases({
      unsecuredSavedObjectsClient,
      options: caseOptions,
    });

    const casesMap = cases.saved_objects.reduce((accMap, caseInfo) => {
      accMap.set(caseInfo.id, caseInfo);
      return accMap;
    }, new Map<string, SavedObjectsFindResult<CaseAttributes>>());

    const totalCommentsForCases = await this.getCaseCommentStats({
      unsecuredSavedObjectsClient,
      ids: Array.from(casesMap.keys()),
    });

    const casesWithComments = new Map<string, CaseResponse>();
    for (const [id, caseInfo] of casesMap.entries()) {
      casesWithComments.set(
        id,
        flattenCaseSavedObject({
          savedObject: caseInfo,
          totalComment: totalCommentsForCases.commentTotals.get(id) ?? 0,
          totalAlerts: totalCommentsForCases.alertTotals.get(id) ?? 0,
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

  /**
   * Retrieves the number of cases that exist with a given status (open, closed, etc).
   */
  public async findCaseStatusStats({
    unsecuredSavedObjectsClient,
    caseOptions,
    ensureSavedObjectsAreAuthorized,
  }: {
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    caseOptions: SavedObjectFindOptionsKueryNode;
    ensureSavedObjectsAreAuthorized: EnsureSOAuthCallback;
  }): Promise<number> {
    const cases = await this.findCases({
      unsecuredSavedObjectsClient,
      options: {
        ...caseOptions,
        page: 1,
        perPage: MAX_DOCS_PER_PAGE,
      },
    });

    // make sure that the retrieved cases were correctly filtered by owner
    ensureSavedObjectsAreAuthorized(
      cases.saved_objects.map((caseInfo) => ({ id: caseInfo.id, owner: caseInfo.attributes.owner }))
    );

    return cases.saved_objects.length;
  }

  /**
   * Returns the number of total comments and alerts for a case
   */
  public async getCaseCommentStats({
    unsecuredSavedObjectsClient,
    ids,
  }: {
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    ids: string[];
  }): Promise<CaseCommentStats> {
    if (ids.length <= 0) {
      return {
        commentTotals: new Map<string, number>(),
        alertTotals: new Map<string, number>(),
      };
    }

    const getCommentsMapper = async (id: string) =>
      this.getAllCaseComments({
        unsecuredSavedObjectsClient,
        id,
        options: { page: 1, perPage: 1 },
      });

    // Ensuring we don't do too many concurrent get running.
    const allComments = await pMap(ids, getCommentsMapper, {
      concurrency: MAX_CONCURRENT_SEARCHES,
    });

    const alerts = await this.getAllCaseComments({
      unsecuredSavedObjectsClient,
      id: ids,
      options: {
        filter: nodeBuilder.is(`${CASE_COMMENT_SAVED_OBJECT}.attributes.type`, CommentType.alert),
      },
    });

    const getID = (comments: SavedObjectsFindResponse<unknown>) => {
      return comments.saved_objects.length > 0
        ? comments.saved_objects[0].references.find((ref) => ref.type === CASE_SAVED_OBJECT)?.id
        : undefined;
    };

    const groupedComments = allComments.reduce((acc, comments) => {
      const id = getID(comments);
      if (id) {
        acc.set(id, comments.total);
      }
      return acc;
    }, new Map<string, number>());

    const groupedAlerts = groupTotalAlertsByID({ comments: alerts });
    return { commentTotals: groupedComments, alertTotals: groupedAlerts };
  }

  public async deleteCase({ unsecuredSavedObjectsClient, id: caseId }: GetCaseArgs) {
    try {
      this.log.debug(`Attempting to DELETE case ${caseId}`);
      return await unsecuredSavedObjectsClient.delete(CASE_SAVED_OBJECT, caseId);
    } catch (error) {
      this.log.error(`Error on DELETE case ${caseId}: ${error}`);
      throw error;
    }
  }

  public async getCase({
    unsecuredSavedObjectsClient,
    id: caseId,
  }: GetCaseArgs): Promise<SavedObject<CaseAttributes>> {
    try {
      this.log.debug(`Attempting to GET case ${caseId}`);
      const caseSavedObject = await unsecuredSavedObjectsClient.get<ESCaseAttributes>(
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
    unsecuredSavedObjectsClient,
    id: caseId,
  }: GetCaseArgs): Promise<SavedObjectsResolveResponse<CaseAttributes>> {
    try {
      this.log.debug(`Attempting to resolve case ${caseId}`);
      const resolveCaseResult = await unsecuredSavedObjectsClient.resolve<ESCaseAttributes>(
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
    unsecuredSavedObjectsClient,
    caseIds,
  }: GetCasesArgs): Promise<SavedObjectsBulkResponse<CaseAttributes>> {
    try {
      this.log.debug(`Attempting to GET cases ${caseIds.join(', ')}`);
      const cases = await unsecuredSavedObjectsClient.bulkGet<ESCaseAttributes>(
        caseIds.map((caseId) => ({ type: CASE_SAVED_OBJECT, id: caseId }))
      );
      return transformBulkResponseToExternalModel(cases);
    } catch (error) {
      this.log.error(`Error on GET cases ${caseIds.join(', ')}: ${error}`);
      throw error;
    }
  }

  public async findCases({
    unsecuredSavedObjectsClient,
    options,
  }: FindCasesArgs): Promise<SavedObjectsFindResponse<CaseAttributes>> {
    try {
      this.log.debug(`Attempting to find cases`);
      const cases = await unsecuredSavedObjectsClient.find<ESCaseAttributes>({
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
    unsecuredSavedObjectsClient,
    id,
    options,
  }: FindCommentsArgs): Promise<SavedObjectsFindResponse<CommentAttributes>> {
    try {
      this.log.debug(`Attempting to GET all comments internal for id ${JSON.stringify(id)}`);
      if (options?.page !== undefined || options?.perPage !== undefined) {
        return unsecuredSavedObjectsClient.find<CommentAttributes>({
          type: CASE_COMMENT_SAVED_OBJECT,
          sortField: defaultSortField,
          ...options,
        });
      }

      return unsecuredSavedObjectsClient.find<CommentAttributes>({
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
    unsecuredSavedObjectsClient,
    id,
    options,
  }: FindCaseCommentsArgs): Promise<SavedObjectsFindResponse<CommentAttributes>> {
    try {
      const refs = this.asArray(id).map((caseID) => ({ type: CASE_SAVED_OBJECT, id: caseID }));
      if (refs.length <= 0) {
        return {
          saved_objects: [],
          total: 0,
          per_page: options?.perPage ?? defaultPerPage,
          page: options?.page ?? defaultPage,
        };
      }

      this.log.debug(`Attempting to GET all comments for case caseID ${JSON.stringify(id)}`);
      return await this.getAllComments({
        unsecuredSavedObjectsClient,
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

  public async getReporters({
    unsecuredSavedObjectsClient,
    filter,
  }: GetReportersArgs): Promise<User[]> {
    try {
      this.log.debug(`Attempting to GET all reporters`);

      const results = await unsecuredSavedObjectsClient.find<
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

  public async getTags({ unsecuredSavedObjectsClient, filter }: GetTagsArgs): Promise<string[]> {
    try {
      this.log.debug(`Attempting to GET all cases`);

      const results = await unsecuredSavedObjectsClient.find<
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

  public async postNewCase({
    unsecuredSavedObjectsClient,
    attributes,
    id,
  }: PostCaseArgs): Promise<SavedObject<CaseAttributes>> {
    try {
      this.log.debug(`Attempting to POST a new case`);
      const transformedAttributes = transformAttributesToESModel(attributes);
      const createdCase = await unsecuredSavedObjectsClient.create<ESCaseAttributes>(
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
    unsecuredSavedObjectsClient,
    caseId,
    updatedAttributes,
    originalCase,
    version,
  }: PatchCaseArgs): Promise<SavedObjectsUpdateResponse<CaseAttributes>> {
    try {
      this.log.debug(`Attempting to UPDATE case ${caseId}`);
      const transformedAttributes = transformAttributesToESModel(updatedAttributes);

      const updatedCase = await unsecuredSavedObjectsClient.update<ESCaseAttributes>(
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
    unsecuredSavedObjectsClient,
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

      const updatedCases = await unsecuredSavedObjectsClient.bulkUpdate<ESCaseAttributes>(
        bulkUpdate
      );
      return transformUpdateResponsesToExternalModels(updatedCases);
    } catch (error) {
      this.log.error(`Error on UPDATE case ${cases.map((c) => c.caseId).join(', ')}: ${error}`);
      throw error;
    }
  }
}
