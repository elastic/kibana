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
  ENABLE_CASE_CONNECTOR,
  MAX_CONCURRENT_SEARCHES,
  MAX_DOCS_PER_PAGE,
  SUB_CASE_SAVED_OBJECT,
} from '../../../common/constants';
import {
  OWNER_FIELD,
  GetCaseIdsByAlertIdAggs,
  AssociationType,
  CaseResponse,
  CasesFindRequest,
  CaseStatuses,
  CaseType,
  caseTypeField,
  CommentAttributes,
  CommentType,
  SubCaseAttributes,
  SubCaseResponse,
  User,
  CaseAttributes,
} from '../../../common/api';
import { SavedObjectFindOptionsKueryNode } from '../../common/types';
import {
  defaultSortField,
  flattenCaseSavedObject,
  flattenSubCaseSavedObject,
  groupTotalAlertsByID,
} from '../../common/utils';
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

interface GetSubCasesArgs extends ClientArgs {
  ids: string[];
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
  includeSubCaseComments?: boolean;
}

interface FindSubCaseCommentsArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  id: string | string[];
  options?: SavedObjectFindOptionsKueryNode;
}

interface FindCasesArgs extends ClientArgs {
  options?: SavedObjectFindOptionsKueryNode;
}

interface FindSubCasesByIDArgs extends FindCasesArgs {
  ids: string[];
}

interface FindSubCasesStatusStats {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  options: SavedObjectFindOptionsKueryNode;
  ids: string[];
}

interface PostCaseArgs extends ClientArgs {
  attributes: CaseAttributes;
  id: string;
}

interface CreateSubCaseArgs extends ClientArgs {
  createdAt: string;
  caseId: string;
  createdBy: User;
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

interface PatchSubCase {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  subCaseId: string;
  updatedAttributes: Partial<SubCaseAttributes>;
  version?: string;
}

interface PatchSubCases {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  subCases: Array<Omit<PatchSubCase, 'unsecuredSavedObjectsClient'>>;
}

interface GetUserArgs {
  request: KibanaRequest;
}

interface SubCasesMapWithPageInfo {
  subCasesMap: Map<string, SubCaseResponse[]>;
  page: number;
  perPage: number;
  total: number;
}

interface CaseCommentStats {
  commentTotals: Map<string, number>;
  alertTotals: Map<string, number>;
}

interface FindCommentsByAssociationArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  id: string | string[];
  associationType: AssociationType;
  options?: SavedObjectFindOptionsKueryNode;
}

interface Collection {
  case: SavedObjectsFindResult<CaseAttributes>;
  subCases?: SubCaseResponse[];
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

const transformNewSubCase = ({
  createdAt,
  createdBy,
  owner,
}: {
  createdAt: string;
  createdBy: User;
  owner: string;
}): SubCaseAttributes => {
  return {
    closed_at: null,
    closed_by: null,
    created_at: createdAt,
    created_by: createdBy,
    status: CaseStatuses.open,
    updated_at: null,
    updated_by: null,
    owner,
  };
};

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
   * Returns a map of all cases combined with their sub cases if they are collections.
   */
  public async findCasesGroupedByID({
    unsecuredSavedObjectsClient,
    caseOptions,
    subCaseOptions,
  }: {
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    caseOptions: FindCaseOptions;
    subCaseOptions?: SavedObjectFindOptionsKueryNode;
  }): Promise<CasesMapWithPageInfo> {
    const cases = await this.findCases({
      unsecuredSavedObjectsClient,
      options: caseOptions,
    });

    const subCasesResp = ENABLE_CASE_CONNECTOR
      ? await this.findSubCasesGroupByCase({
          unsecuredSavedObjectsClient,
          options: subCaseOptions,
          ids: cases.saved_objects
            .filter((caseInfo) => caseInfo.attributes.type === CaseType.collection)
            .map((caseInfo) => caseInfo.id),
        })
      : { subCasesMap: new Map<string, SubCaseResponse[]>(), page: 0, perPage: 0 };

    const casesMap = cases.saved_objects.reduce((accMap, caseInfo) => {
      const subCasesForCase = subCasesResp.subCasesMap.get(caseInfo.id);

      /**
       * If this case is an individual add it to the return map
       * If it is a collection and it has sub cases add it to the return map
       * If it is a collection and it does not have sub cases, check and see if we're filtering on a status,
       *  if we're filtering on a status then exclude the empty collection from the results
       *  if we're not filtering on a status then include the empty collection (that way we can display all the collections
       *  when the UI isn't doing any filtering)
       */
      if (
        caseInfo.attributes.type === CaseType.individual ||
        subCasesForCase !== undefined ||
        !caseOptions.status
      ) {
        accMap.set(caseInfo.id, { case: caseInfo, subCases: subCasesForCase });
      }
      return accMap;
    }, new Map<string, Collection>());

    /**
     * One potential optimization here is to get all comment stats for individual cases, parent cases, and sub cases
     * in a single request. This can be done because comments that are for sub cases have a reference to both the sub case
     * and the parent. The associationType field allows us to determine which type of case the comment is attached to.
     *
     * So we could use the ids for all the valid cases (individual cases and parents with sub cases) to grab everything.
     * Once we have it we can build the maps.
     *
     * Currently we get all comment stats for all sub cases in one go and we get all comment stats for cases (individual and parent)
     * in another request (the one below this comment).
     */
    const totalCommentsForCases = await this.getCaseCommentStats({
      unsecuredSavedObjectsClient,
      ids: Array.from(casesMap.keys()),
      associationType: AssociationType.case,
    });

    const casesWithComments = new Map<string, CaseResponse>();
    for (const [id, caseInfo] of casesMap.entries()) {
      casesWithComments.set(
        id,
        flattenCaseSavedObject({
          savedObject: caseInfo.case,
          totalComment: totalCommentsForCases.commentTotals.get(id) ?? 0,
          totalAlerts: totalCommentsForCases.alertTotals.get(id) ?? 0,
          subCases: caseInfo.subCases,
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
   * This also counts sub cases. Parent cases are excluded from the statistics.
   */
  public async findCaseStatusStats({
    unsecuredSavedObjectsClient,
    caseOptions,
    subCaseOptions,
    ensureSavedObjectsAreAuthorized,
  }: {
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    caseOptions: SavedObjectFindOptionsKueryNode;
    ensureSavedObjectsAreAuthorized: EnsureSOAuthCallback;
    subCaseOptions?: SavedObjectFindOptionsKueryNode;
  }): Promise<number> {
    /**
     * This could be made more performant. What we're doing here is retrieving all cases
     * that match the API request's filters instead of just counts. This is because we need to grab
     * the ids for the parent cases that match those filters. Then we use those IDS to count how many
     * sub cases those parents have to calculate the total amount of cases that are open, closed, or in-progress.
     *
     * Another solution would be to store ALL filterable fields on both a case and sub case. That we could do a single
     * query for each type to calculate the totals using the filters. This has drawbacks though:
     *
     * We'd have to sync up the parent case's editable attributes with the sub case any time they were change to avoid
     * them getting out of sync and causing issues when we do these types of stats aggregations. This would result in a lot
     * of update requests if the user is editing their case details often. Which could potentially cause conflict failures.
     *
     * Another option is to prevent the ability from update the parent case's details all together once it's created. A user
     * could instead modify the sub case details directly. This could be weird though because individual sub cases for the same
     * parent would have different titles, tags, etc.
     *
     * Another potential issue with this approach is when you push a case and all its sub case information. If the sub cases
     * don't have the same title and tags, we'd need to account for that as well.
     */
    const cases = await this.findCases({
      unsecuredSavedObjectsClient,
      options: {
        ...caseOptions,
        fields: includeFieldsRequiredForAuthentication([caseTypeField]),
        page: 1,
        perPage: MAX_DOCS_PER_PAGE,
      },
    });

    // make sure that the retrieved cases were correctly filtered by owner
    ensureSavedObjectsAreAuthorized(
      cases.saved_objects.map((caseInfo) => ({ id: caseInfo.id, owner: caseInfo.attributes.owner }))
    );

    const caseIds = cases.saved_objects
      .filter((caseInfo) => caseInfo.attributes.type === CaseType.collection)
      .map((caseInfo) => caseInfo.id);

    let subCasesTotal = 0;

    if (ENABLE_CASE_CONNECTOR && subCaseOptions) {
      subCasesTotal = await this.findSubCaseStatusStats({
        unsecuredSavedObjectsClient,
        options: subCaseOptions,
        ids: caseIds,
      });
    }

    const total =
      cases.saved_objects.filter((caseInfo) => caseInfo.attributes.type !== CaseType.collection)
        .length + subCasesTotal;

    return total;
  }

  /**
   * Retrieves the comments attached to a case or sub case.
   */
  public async getCommentsByAssociation({
    unsecuredSavedObjectsClient,
    id,
    associationType,
    options,
  }: FindCommentsByAssociationArgs): Promise<SavedObjectsFindResponse<CommentAttributes>> {
    if (associationType === AssociationType.subCase) {
      return this.getAllSubCaseComments({
        unsecuredSavedObjectsClient,
        id,
        options,
      });
    } else {
      return this.getAllCaseComments({
        unsecuredSavedObjectsClient,
        id,
        options,
      });
    }
  }

  /**
   * Returns the number of total comments and alerts for a case (or sub case)
   */
  public async getCaseCommentStats({
    unsecuredSavedObjectsClient,
    ids,
    associationType,
  }: {
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    ids: string[];
    associationType: AssociationType;
  }): Promise<CaseCommentStats> {
    if (ids.length <= 0) {
      return {
        commentTotals: new Map<string, number>(),
        alertTotals: new Map<string, number>(),
      };
    }

    const refType =
      associationType === AssociationType.case ? CASE_SAVED_OBJECT : SUB_CASE_SAVED_OBJECT;

    const getCommentsMapper = async (id: string) =>
      this.getCommentsByAssociation({
        unsecuredSavedObjectsClient,
        associationType,
        id,
        options: { page: 1, perPage: 1 },
      });

    // Ensuring we don't too many concurrent get running.
    const allComments = await pMap(ids, getCommentsMapper, {
      concurrency: MAX_CONCURRENT_SEARCHES,
    });

    const alerts = await this.getCommentsByAssociation({
      unsecuredSavedObjectsClient,
      associationType,
      id: ids,
      options: {
        filter: nodeBuilder.or([
          nodeBuilder.is(`${CASE_COMMENT_SAVED_OBJECT}.attributes.type`, CommentType.alert),
          nodeBuilder.is(
            `${CASE_COMMENT_SAVED_OBJECT}.attributes.type`,
            CommentType.generatedAlert
          ),
        ]),
      },
    });

    const getID = (comments: SavedObjectsFindResponse<unknown>) => {
      return comments.saved_objects.length > 0
        ? comments.saved_objects[0].references.find((ref) => ref.type === refType)?.id
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

  /**
   * Returns all the sub cases for a set of case IDs. Comment statistics are also returned.
   */
  public async findSubCasesGroupByCase({
    unsecuredSavedObjectsClient,
    options,
    ids,
  }: {
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    options?: SavedObjectFindOptionsKueryNode;
    ids: string[];
  }): Promise<SubCasesMapWithPageInfo> {
    const getCaseID = (subCase: SavedObjectsFindResult<SubCaseAttributes>): string | undefined => {
      return subCase.references.length > 0 ? subCase.references[0].id : undefined;
    };

    const emptyResponse = {
      subCasesMap: new Map<string, SubCaseResponse[]>(),
      page: 0,
      perPage: 0,
      total: 0,
    };

    if (!options) {
      return emptyResponse;
    }

    if (ids.length <= 0) {
      return emptyResponse;
    }

    const subCases = await this.findSubCases({
      unsecuredSavedObjectsClient,
      options: {
        ...options,
        hasReference: ids.map((id) => {
          return {
            id,
            type: CASE_SAVED_OBJECT,
          };
        }),
      },
    });

    const subCaseComments = await this.getCaseCommentStats({
      unsecuredSavedObjectsClient,
      ids: subCases.saved_objects.map((subCase) => subCase.id),
      associationType: AssociationType.subCase,
    });

    const subCasesMap = subCases.saved_objects.reduce((accMap, subCase) => {
      const parentCaseID = getCaseID(subCase);
      if (parentCaseID) {
        const subCaseFromMap = accMap.get(parentCaseID);

        if (subCaseFromMap === undefined) {
          const subCasesForID = [
            flattenSubCaseSavedObject({
              savedObject: subCase,
              totalComment: subCaseComments.commentTotals.get(subCase.id) ?? 0,
              totalAlerts: subCaseComments.alertTotals.get(subCase.id) ?? 0,
            }),
          ];
          accMap.set(parentCaseID, subCasesForID);
        } else {
          subCaseFromMap.push(
            flattenSubCaseSavedObject({
              savedObject: subCase,
              totalComment: subCaseComments.commentTotals.get(subCase.id) ?? 0,
              totalAlerts: subCaseComments.alertTotals.get(subCase.id) ?? 0,
            })
          );
        }
      }
      return accMap;
    }, new Map<string, SubCaseResponse[]>());

    return { subCasesMap, page: subCases.page, perPage: subCases.per_page, total: subCases.total };
  }

  /**
   * Calculates the number of sub cases for a given set of options for a set of case IDs.
   */
  public async findSubCaseStatusStats({
    unsecuredSavedObjectsClient,
    options,
    ids,
  }: FindSubCasesStatusStats): Promise<number> {
    if (ids.length <= 0) {
      return 0;
    }

    const subCases = await this.findSubCases({
      unsecuredSavedObjectsClient,
      options: {
        ...options,
        page: 1,
        perPage: 1,
        fields: [],
        hasReference: ids.map((id) => {
          return {
            id,
            type: CASE_SAVED_OBJECT,
          };
        }),
      },
    });

    return subCases.total;
  }

  public async createSubCase({
    unsecuredSavedObjectsClient,
    createdAt,
    caseId,
    createdBy,
  }: CreateSubCaseArgs): Promise<SavedObject<SubCaseAttributes>> {
    try {
      this.log.debug(`Attempting to POST a new sub case`);
      return unsecuredSavedObjectsClient.create<SubCaseAttributes>(
        SUB_CASE_SAVED_OBJECT,
        // ENABLE_CASE_CONNECTOR: populate the owner field correctly
        transformNewSubCase({ createdAt, createdBy, owner: '' }),
        {
          references: [
            {
              type: CASE_SAVED_OBJECT,
              name: `associated-${CASE_SAVED_OBJECT}`,
              id: caseId,
            },
          ],
        }
      );
    } catch (error) {
      this.log.error(`Error on POST a new sub case for id ${caseId}: ${error}`);
      throw error;
    }
  }

  public async getMostRecentSubCase(
    unsecuredSavedObjectsClient: SavedObjectsClientContract,
    caseId: string
  ) {
    try {
      this.log.debug(`Attempting to find most recent sub case for caseID: ${caseId}`);
      const subCases = await unsecuredSavedObjectsClient.find<SubCaseAttributes>({
        perPage: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
        type: SUB_CASE_SAVED_OBJECT,
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
      });
      if (subCases.saved_objects.length <= 0) {
        return;
      }

      return subCases.saved_objects[0];
    } catch (error) {
      this.log.error(`Error finding the most recent sub case for case: ${caseId}: ${error}`);
      throw error;
    }
  }

  public async deleteSubCase(unsecuredSavedObjectsClient: SavedObjectsClientContract, id: string) {
    try {
      this.log.debug(`Attempting to DELETE sub case ${id}`);
      return await unsecuredSavedObjectsClient.delete(SUB_CASE_SAVED_OBJECT, id);
    } catch (error) {
      this.log.error(`Error on DELETE sub case ${id}: ${error}`);
      throw error;
    }
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

  public async getSubCase({
    unsecuredSavedObjectsClient,
    id,
  }: GetCaseArgs): Promise<SavedObject<SubCaseAttributes>> {
    try {
      this.log.debug(`Attempting to GET sub case ${id}`);
      return await unsecuredSavedObjectsClient.get<SubCaseAttributes>(SUB_CASE_SAVED_OBJECT, id);
    } catch (error) {
      this.log.error(`Error on GET sub case ${id}: ${error}`);
      throw error;
    }
  }

  public async getSubCases({
    unsecuredSavedObjectsClient,
    ids,
  }: GetSubCasesArgs): Promise<SavedObjectsBulkResponse<SubCaseAttributes>> {
    try {
      this.log.debug(`Attempting to GET sub cases ${ids.join(', ')}`);
      return await unsecuredSavedObjectsClient.bulkGet<SubCaseAttributes>(
        ids.map((id) => ({ type: SUB_CASE_SAVED_OBJECT, id }))
      );
    } catch (error) {
      this.log.error(`Error on GET cases ${ids.join(', ')}: ${error}`);
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

  public async findSubCases({
    unsecuredSavedObjectsClient,
    options,
  }: FindCasesArgs): Promise<SavedObjectsFindResponse<SubCaseAttributes>> {
    try {
      this.log.debug(`Attempting to find sub cases`);
      // if the page or perPage options are set then respect those instead of trying to
      // grab all sub cases
      if (options?.page !== undefined || options?.perPage !== undefined) {
        return unsecuredSavedObjectsClient.find<SubCaseAttributes>({
          sortField: defaultSortField,
          ...options,
          type: SUB_CASE_SAVED_OBJECT,
        });
      }

      return unsecuredSavedObjectsClient.find<SubCaseAttributes>({
        page: 1,
        perPage: MAX_DOCS_PER_PAGE,
        sortField: defaultSortField,
        ...options,
        type: SUB_CASE_SAVED_OBJECT,
      });
    } catch (error) {
      this.log.error(`Error on find sub cases: ${error}`);
      throw error;
    }
  }

  /**
   * Find sub cases using a collection's ID. This would try to retrieve the maximum amount of sub cases
   * by default.
   *
   * @param id the saved object ID of the parent collection to find sub cases for.
   */
  public async findSubCasesByCaseId({
    unsecuredSavedObjectsClient,
    ids,
    options,
  }: FindSubCasesByIDArgs): Promise<SavedObjectsFindResponse<SubCaseAttributes>> {
    if (ids.length <= 0) {
      return {
        total: 0,
        saved_objects: [],
        page: options?.page ?? defaultPage,
        per_page: options?.perPage ?? defaultPerPage,
      };
    }

    try {
      this.log.debug(`Attempting to GET sub cases for case collection id ${ids.join(', ')}`);
      return this.findSubCases({
        unsecuredSavedObjectsClient,
        options: {
          ...options,
          hasReference: ids.map((id) => ({
            type: CASE_SAVED_OBJECT,
            id,
          })),
        },
      });
    } catch (error) {
      this.log.error(
        `Error on GET all sub cases for case collection id ${ids.join(', ')}: ${error}`
      );
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
   *
   * @param includeSubCaseComments is a flag to indicate that sub case comments should be included as well, by default
   *  sub case comments are excluded. If the `filter` field is included in the options, it will override this behavior
   */
  public async getAllCaseComments({
    unsecuredSavedObjectsClient,
    id,
    options,
    includeSubCaseComments = false,
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

      let filter: KueryNode | undefined;
      if (!includeSubCaseComments) {
        // if other filters were passed in then combine them to filter out sub case comments
        const associationTypeFilter = nodeBuilder.is(
          `${CASE_COMMENT_SAVED_OBJECT}.attributes.associationType`,
          AssociationType.case
        );

        filter =
          options?.filter != null
            ? nodeBuilder.and([options.filter, associationTypeFilter])
            : associationTypeFilter;
      }

      this.log.debug(`Attempting to GET all comments for case caseID ${JSON.stringify(id)}`);
      return await this.getAllComments({
        unsecuredSavedObjectsClient,
        id,
        options: {
          hasReferenceOperator: 'OR',
          hasReference: refs,
          filter,
          ...options,
        },
      });
    } catch (error) {
      this.log.error(`Error on GET all comments for case ${JSON.stringify(id)}: ${error}`);
      throw error;
    }
  }

  public async getAllSubCaseComments({
    unsecuredSavedObjectsClient,
    id,
    options,
  }: FindSubCaseCommentsArgs): Promise<SavedObjectsFindResponse<CommentAttributes>> {
    try {
      const refs = this.asArray(id).map((caseID) => ({ type: SUB_CASE_SAVED_OBJECT, id: caseID }));
      if (refs.length <= 0) {
        return {
          saved_objects: [],
          total: 0,
          per_page: options?.perPage ?? defaultPerPage,
          page: options?.page ?? defaultPage,
        };
      }

      this.log.debug(`Attempting to GET all comments for sub case caseID ${JSON.stringify(id)}`);
      return await this.getAllComments({
        unsecuredSavedObjectsClient,
        id,
        options: {
          hasReferenceOperator: 'OR',
          hasReference: refs,
          ...options,
        },
      });
    } catch (error) {
      this.log.error(`Error on GET all comments for sub case ${JSON.stringify(id)}: ${error}`);
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
            },
            aggs: {
              top_docs: {
                top_hits: {
                  size: 1,
                },
              },
            },
          },
        },
      });

      return (
        // eslint-disable-next-line @typescript-eslint/naming-convention
        results?.aggregations?.reporters?.buckets.map(({ key, top_docs }) => {
          const user = top_docs?.hits?.hits?.[0]?._source?.cases?.created_by ?? {};
          return {
            username: key,
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

  public async patchSubCase({
    unsecuredSavedObjectsClient,
    subCaseId,
    updatedAttributes,
    version,
  }: PatchSubCase) {
    try {
      this.log.debug(`Attempting to UPDATE sub case ${subCaseId}`);
      return await unsecuredSavedObjectsClient.update<SubCaseAttributes>(
        SUB_CASE_SAVED_OBJECT,
        subCaseId,
        { ...updatedAttributes },
        { version }
      );
    } catch (error) {
      this.log.error(`Error on UPDATE sub case ${subCaseId}: ${error}`);
      throw error;
    }
  }

  public async patchSubCases({ unsecuredSavedObjectsClient, subCases }: PatchSubCases) {
    try {
      this.log.debug(
        `Attempting to UPDATE sub case ${subCases.map((c) => c.subCaseId).join(', ')}`
      );
      return await unsecuredSavedObjectsClient.bulkUpdate<SubCaseAttributes>(
        subCases.map((c) => ({
          type: SUB_CASE_SAVED_OBJECT,
          id: c.subCaseId,
          attributes: c.updatedAttributes,
          version: c.version,
        }))
      );
    } catch (error) {
      this.log.error(
        `Error on UPDATE sub case ${subCases.map((c) => c.subCaseId).join(', ')}: ${error}`
      );
      throw error;
    }
  }
}
