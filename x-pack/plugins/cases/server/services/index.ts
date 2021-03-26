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
  SavedObjectsUpdateResponse,
  SavedObjectReference,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsBulkResponse,
  SavedObjectsFindResult,
} from 'kibana/server';

import { AuthenticatedUser, SecurityPluginSetup } from '../../../security/server';
import {
  ENABLE_CASE_CONNECTOR,
  ESCaseAttributes,
  CommentAttributes,
  SavedObjectFindOptions,
  User,
  CommentPatchAttributes,
  SubCaseAttributes,
  AssociationType,
  SubCaseResponse,
  CommentType,
  CaseType,
  CaseResponse,
  caseTypeField,
  CasesFindRequest,
} from '../../common';
import { combineFilters, defaultSortField, groupTotalAlertsByID } from '../common';
import { defaultPage, defaultPerPage } from '../routes/api';
import {
  flattenCaseSavedObject,
  flattenSubCaseSavedObject,
  transformNewSubCase,
} from '../routes/api/utils';
import {
  CASE_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  SUB_CASE_SAVED_OBJECT,
} from '../saved_object_types';
import { readReporters } from './reporters/read_reporters';
import { readTags } from './tags/read_tags';

export { CaseConfigureService, CaseConfigureServiceSetup } from './configure';
export { CaseUserActionService, CaseUserActionServiceSetup } from './user_actions';
export { ConnectorMappingsService, ConnectorMappingsServiceSetup } from './connector_mappings';
export { AlertService, AlertServiceContract } from './alerts';

export interface ClientArgs {
  client: SavedObjectsClientContract;
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
  client: SavedObjectsClientContract;
  id: string | string[];
  options?: SavedObjectFindOptions;
}

interface FindCaseCommentsArgs {
  client: SavedObjectsClientContract;
  id: string | string[];
  options?: SavedObjectFindOptions;
  includeSubCaseComments?: boolean;
}

interface FindSubCaseCommentsArgs {
  client: SavedObjectsClientContract;
  id: string | string[];
  options?: SavedObjectFindOptions;
}

interface FindCasesArgs extends ClientArgs {
  options?: SavedObjectFindOptions;
}

interface FindSubCasesByIDArgs extends FindCasesArgs {
  ids: string[];
}

interface FindSubCasesStatusStats {
  client: SavedObjectsClientContract;
  options: SavedObjectFindOptions;
  ids: string[];
}

interface GetCommentArgs extends ClientArgs {
  commentId: string;
}

interface PostCaseArgs extends ClientArgs {
  attributes: ESCaseAttributes;
}

interface CreateSubCaseArgs extends ClientArgs {
  createdAt: string;
  caseId: string;
  createdBy: User;
}

interface PostCommentArgs extends ClientArgs {
  attributes: CommentAttributes;
  references: SavedObjectReference[];
}

interface PatchCase {
  caseId: string;
  updatedAttributes: Partial<ESCaseAttributes & PushedArgs>;
  version?: string;
}
type PatchCaseArgs = PatchCase & ClientArgs;

interface PatchCasesArgs extends ClientArgs {
  cases: PatchCase[];
}

interface PatchComment {
  commentId: string;
  updatedAttributes: CommentPatchAttributes;
  version?: string;
}

type UpdateCommentArgs = PatchComment & ClientArgs;

interface PatchComments extends ClientArgs {
  comments: PatchComment[];
}

interface PatchSubCase {
  client: SavedObjectsClientContract;
  subCaseId: string;
  updatedAttributes: Partial<SubCaseAttributes>;
  version?: string;
}

interface PatchSubCases {
  client: SavedObjectsClientContract;
  subCases: Array<Omit<PatchSubCase, 'client'>>;
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
  client: SavedObjectsClientContract;
  id: string | string[];
  associationType: AssociationType;
  options?: SavedObjectFindOptions;
}

interface Collection {
  case: SavedObjectsFindResult<ESCaseAttributes>;
  subCases?: SubCaseResponse[];
}

interface CasesMapWithPageInfo {
  casesMap: Map<string, CaseResponse>;
  page: number;
  perPage: number;
  total: number;
}

type FindCaseOptions = CasesFindRequest & SavedObjectFindOptions;

export interface CaseServiceSetup {
  deleteCase(args: GetCaseArgs): Promise<{}>;
  deleteComment(args: GetCommentArgs): Promise<{}>;
  deleteSubCase(client: SavedObjectsClientContract, id: string): Promise<{}>;
  findCases(args: FindCasesArgs): Promise<SavedObjectsFindResponse<ESCaseAttributes>>;
  findSubCases(args: FindCasesArgs): Promise<SavedObjectsFindResponse<SubCaseAttributes>>;
  findSubCasesByCaseId(
    args: FindSubCasesByIDArgs
  ): Promise<SavedObjectsFindResponse<SubCaseAttributes>>;
  getAllCaseComments(
    args: FindCaseCommentsArgs
  ): Promise<SavedObjectsFindResponse<CommentAttributes>>;
  getAllSubCaseComments(
    args: FindSubCaseCommentsArgs
  ): Promise<SavedObjectsFindResponse<CommentAttributes>>;
  getCase(args: GetCaseArgs): Promise<SavedObject<ESCaseAttributes>>;
  getSubCase(args: GetCaseArgs): Promise<SavedObject<SubCaseAttributes>>;
  getSubCases(args: GetSubCasesArgs): Promise<SavedObjectsBulkResponse<SubCaseAttributes>>;
  getCases(args: GetCasesArgs): Promise<SavedObjectsBulkResponse<ESCaseAttributes>>;
  getComment(args: GetCommentArgs): Promise<SavedObject<CommentAttributes>>;
  getTags(args: ClientArgs): Promise<string[]>;
  getReporters(args: ClientArgs): Promise<User[]>;
  getUser(args: GetUserArgs): Promise<AuthenticatedUser | User>;
  postNewCase(args: PostCaseArgs): Promise<SavedObject<ESCaseAttributes>>;
  postNewComment(args: PostCommentArgs): Promise<SavedObject<CommentAttributes>>;
  patchCase(args: PatchCaseArgs): Promise<SavedObjectsUpdateResponse<ESCaseAttributes>>;
  patchCases(args: PatchCasesArgs): Promise<SavedObjectsBulkUpdateResponse<ESCaseAttributes>>;
  patchComment(args: UpdateCommentArgs): Promise<SavedObjectsUpdateResponse<CommentAttributes>>;
  patchComments(args: PatchComments): Promise<SavedObjectsBulkUpdateResponse<CommentAttributes>>;
  getMostRecentSubCase(
    client: SavedObjectsClientContract,
    caseId: string
  ): Promise<SavedObject<SubCaseAttributes> | undefined>;
  createSubCase(args: CreateSubCaseArgs): Promise<SavedObject<SubCaseAttributes>>;
  patchSubCase(args: PatchSubCase): Promise<SavedObjectsUpdateResponse<SubCaseAttributes>>;
  patchSubCases(args: PatchSubCases): Promise<SavedObjectsBulkUpdateResponse<SubCaseAttributes>>;
  findSubCaseStatusStats(args: FindSubCasesStatusStats): Promise<number>;
  getCommentsByAssociation(
    args: FindCommentsByAssociationArgs
  ): Promise<SavedObjectsFindResponse<CommentAttributes>>;
  getCaseCommentStats(args: {
    client: SavedObjectsClientContract;
    ids: string[];
    associationType: AssociationType;
  }): Promise<CaseCommentStats>;
  findSubCasesGroupByCase(args: {
    client: SavedObjectsClientContract;
    options?: SavedObjectFindOptions;
    ids: string[];
  }): Promise<SubCasesMapWithPageInfo>;
  findCaseStatusStats(args: {
    client: SavedObjectsClientContract;
    caseOptions: SavedObjectFindOptions;
    subCaseOptions?: SavedObjectFindOptions;
  }): Promise<number>;
  findCasesGroupedByID(args: {
    client: SavedObjectsClientContract;
    caseOptions: SavedObjectFindOptions;
    subCaseOptions?: SavedObjectFindOptions;
  }): Promise<CasesMapWithPageInfo>;
}

export class CaseService implements CaseServiceSetup {
  constructor(
    private readonly log: Logger,
    private readonly authentication?: SecurityPluginSetup['authc']
  ) {}

  /**
   * Returns a map of all cases combined with their sub cases if they are collections.
   */
  public async findCasesGroupedByID({
    client,
    caseOptions,
    subCaseOptions,
  }: {
    client: SavedObjectsClientContract;
    caseOptions: FindCaseOptions;
    subCaseOptions?: SavedObjectFindOptions;
  }): Promise<CasesMapWithPageInfo> {
    const cases = await this.findCases({
      client,
      options: caseOptions,
    });

    const subCasesResp = ENABLE_CASE_CONNECTOR
      ? await this.findSubCasesGroupByCase({
          client,
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
      client,
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
    client,
    caseOptions,
    subCaseOptions,
  }: {
    client: SavedObjectsClientContract;
    caseOptions: SavedObjectFindOptions;
    subCaseOptions?: SavedObjectFindOptions;
  }): Promise<number> {
    const casesStats = await this.findCases({
      client,
      options: {
        ...caseOptions,
        fields: [],
        page: 1,
        perPage: 1,
      },
    });

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
      client,
      options: {
        ...caseOptions,
        fields: [caseTypeField],
        page: 1,
        perPage: casesStats.total,
      },
    });

    const caseIds = cases.saved_objects
      .filter((caseInfo) => caseInfo.attributes.type === CaseType.collection)
      .map((caseInfo) => caseInfo.id);

    let subCasesTotal = 0;

    if (ENABLE_CASE_CONNECTOR && subCaseOptions) {
      subCasesTotal = await this.findSubCaseStatusStats({
        client,
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
    client,
    id,
    associationType,
    options,
  }: FindCommentsByAssociationArgs): Promise<SavedObjectsFindResponse<CommentAttributes>> {
    if (associationType === AssociationType.subCase) {
      return this.getAllSubCaseComments({
        client,
        id,
        options,
      });
    } else {
      return this.getAllCaseComments({
        client,
        id,
        options,
      });
    }
  }

  /**
   * Returns the number of total comments and alerts for a case (or sub case)
   */
  public async getCaseCommentStats({
    client,
    ids,
    associationType,
  }: {
    client: SavedObjectsClientContract;
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

    const allComments = await Promise.all(
      ids.map((id) =>
        this.getCommentsByAssociation({
          client,
          associationType,
          id,
          options: { page: 1, perPage: 1 },
        })
      )
    );

    const alerts = await this.getCommentsByAssociation({
      client,
      associationType,
      id: ids,
      options: {
        filter: `(${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.alert} OR ${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.generatedAlert})`,
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
    client,
    options,
    ids,
  }: {
    client: SavedObjectsClientContract;
    options?: SavedObjectFindOptions;
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
      client,
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
      client,
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
    client,
    options,
    ids,
  }: FindSubCasesStatusStats): Promise<number> {
    if (ids.length <= 0) {
      return 0;
    }

    const subCases = await this.findSubCases({
      client,
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
    client,
    createdAt,
    caseId,
    createdBy,
  }: CreateSubCaseArgs): Promise<SavedObject<SubCaseAttributes>> {
    try {
      this.log.debug(`Attempting to POST a new sub case`);
      return client.create(SUB_CASE_SAVED_OBJECT, transformNewSubCase({ createdAt, createdBy }), {
        references: [
          {
            type: CASE_SAVED_OBJECT,
            name: `associated-${CASE_SAVED_OBJECT}`,
            id: caseId,
          },
        ],
      });
    } catch (error) {
      this.log.error(`Error on POST a new sub case for id ${caseId}: ${error}`);
      throw error;
    }
  }

  public async getMostRecentSubCase(client: SavedObjectsClientContract, caseId: string) {
    try {
      this.log.debug(`Attempting to find most recent sub case for caseID: ${caseId}`);
      const subCases: SavedObjectsFindResponse<SubCaseAttributes> = await client.find({
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

  public async deleteSubCase(client: SavedObjectsClientContract, id: string) {
    try {
      this.log.debug(`Attempting to DELETE sub case ${id}`);
      return await client.delete(SUB_CASE_SAVED_OBJECT, id);
    } catch (error) {
      this.log.error(`Error on DELETE sub case ${id}: ${error}`);
      throw error;
    }
  }

  public async deleteCase({ client, id: caseId }: GetCaseArgs) {
    try {
      this.log.debug(`Attempting to DELETE case ${caseId}`);
      return await client.delete(CASE_SAVED_OBJECT, caseId);
    } catch (error) {
      this.log.error(`Error on DELETE case ${caseId}: ${error}`);
      throw error;
    }
  }
  public async deleteComment({ client, commentId }: GetCommentArgs) {
    try {
      this.log.debug(`Attempting to GET comment ${commentId}`);
      return await client.delete(CASE_COMMENT_SAVED_OBJECT, commentId);
    } catch (error) {
      this.log.error(`Error on GET comment ${commentId}: ${error}`);
      throw error;
    }
  }
  public async getCase({
    client,
    id: caseId,
  }: GetCaseArgs): Promise<SavedObject<ESCaseAttributes>> {
    try {
      this.log.debug(`Attempting to GET case ${caseId}`);
      return await client.get(CASE_SAVED_OBJECT, caseId);
    } catch (error) {
      this.log.error(`Error on GET case ${caseId}: ${error}`);
      throw error;
    }
  }
  public async getSubCase({ client, id }: GetCaseArgs): Promise<SavedObject<SubCaseAttributes>> {
    try {
      this.log.debug(`Attempting to GET sub case ${id}`);
      return await client.get(SUB_CASE_SAVED_OBJECT, id);
    } catch (error) {
      this.log.error(`Error on GET sub case ${id}: ${error}`);
      throw error;
    }
  }

  public async getSubCases({
    client,
    ids,
  }: GetSubCasesArgs): Promise<SavedObjectsBulkResponse<SubCaseAttributes>> {
    try {
      this.log.debug(`Attempting to GET sub cases ${ids.join(', ')}`);
      return await client.bulkGet(ids.map((id) => ({ type: SUB_CASE_SAVED_OBJECT, id })));
    } catch (error) {
      this.log.error(`Error on GET cases ${ids.join(', ')}: ${error}`);
      throw error;
    }
  }

  public async getCases({
    client,
    caseIds,
  }: GetCasesArgs): Promise<SavedObjectsBulkResponse<ESCaseAttributes>> {
    try {
      this.log.debug(`Attempting to GET cases ${caseIds.join(', ')}`);
      return await client.bulkGet(
        caseIds.map((caseId) => ({ type: CASE_SAVED_OBJECT, id: caseId }))
      );
    } catch (error) {
      this.log.error(`Error on GET cases ${caseIds.join(', ')}: ${error}`);
      throw error;
    }
  }
  public async getComment({
    client,
    commentId,
  }: GetCommentArgs): Promise<SavedObject<CommentAttributes>> {
    try {
      this.log.debug(`Attempting to GET comment ${commentId}`);
      return await client.get(CASE_COMMENT_SAVED_OBJECT, commentId);
    } catch (error) {
      this.log.error(`Error on GET comment ${commentId}: ${error}`);
      throw error;
    }
  }

  public async findCases({
    client,
    options,
  }: FindCasesArgs): Promise<SavedObjectsFindResponse<ESCaseAttributes>> {
    try {
      this.log.debug(`Attempting to find cases`);
      return await client.find({
        sortField: defaultSortField,
        ...options,
        type: CASE_SAVED_OBJECT,
      });
    } catch (error) {
      this.log.error(`Error on find cases: ${error}`);
      throw error;
    }
  }

  public async findSubCases({
    client,
    options,
  }: FindCasesArgs): Promise<SavedObjectsFindResponse<SubCaseAttributes>> {
    try {
      this.log.debug(`Attempting to find sub cases`);
      // if the page or perPage options are set then respect those instead of trying to
      // grab all sub cases
      if (options?.page !== undefined || options?.perPage !== undefined) {
        return client.find({
          sortField: defaultSortField,
          ...options,
          type: SUB_CASE_SAVED_OBJECT,
        });
      }

      const stats = await client.find({
        fields: [],
        page: 1,
        perPage: 1,
        sortField: defaultSortField,
        ...options,
        type: SUB_CASE_SAVED_OBJECT,
      });
      return client.find({
        page: 1,
        perPage: stats.total,
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
    client,
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
        client,
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
    client,
    id,
    options,
  }: FindCommentsArgs): Promise<SavedObjectsFindResponse<CommentAttributes>> {
    try {
      this.log.debug(`Attempting to GET all comments for id ${JSON.stringify(id)}`);
      if (options?.page !== undefined || options?.perPage !== undefined) {
        return client.find({
          type: CASE_COMMENT_SAVED_OBJECT,
          sortField: defaultSortField,
          ...options,
        });
      }
      // get the total number of comments that are in ES then we'll grab them all in one go
      const stats = await client.find({
        type: CASE_COMMENT_SAVED_OBJECT,
        fields: [],
        page: 1,
        perPage: 1,
        sortField: defaultSortField,
        // spread the options after so the caller can override the default behavior if they want
        ...options,
      });

      return client.find({
        type: CASE_COMMENT_SAVED_OBJECT,
        page: 1,
        perPage: stats.total,
        sortField: defaultSortField,
        ...options,
      });
    } catch (error) {
      this.log.error(`Error on GET all comments for ${JSON.stringify(id)}: ${error}`);
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
    client,
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

      let filter: string | undefined;
      if (!includeSubCaseComments) {
        // if other filters were passed in then combine them to filter out sub case comments
        filter = combineFilters(
          [
            options?.filter ?? '',
            `${CASE_COMMENT_SAVED_OBJECT}.attributes.associationType: ${AssociationType.case}`,
          ],
          'AND'
        );
      }

      this.log.debug(`Attempting to GET all comments for case caseID ${JSON.stringify(id)}`);
      return this.getAllComments({
        client,
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
    client,
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
      return this.getAllComments({
        client,
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

  public async getReporters({ client }: ClientArgs) {
    try {
      this.log.debug(`Attempting to GET all reporters`);
      return await readReporters({ client });
    } catch (error) {
      this.log.error(`Error on GET all reporters: ${error}`);
      throw error;
    }
  }
  public async getTags({ client }: ClientArgs) {
    try {
      this.log.debug(`Attempting to GET all cases`);
      return await readTags({ client });
    } catch (error) {
      this.log.error(`Error on GET cases: ${error}`);
      throw error;
    }
  }

  public async getUser({ request }: GetUserArgs) {
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
      this.log.error(`Error on GET cases: ${error}`);
      throw error;
    }
  }
  public async postNewCase({ client, attributes }: PostCaseArgs) {
    try {
      this.log.debug(`Attempting to POST a new case`);
      return await client.create(CASE_SAVED_OBJECT, { ...attributes });
    } catch (error) {
      this.log.error(`Error on POST a new case: ${error}`);
      throw error;
    }
  }
  public async postNewComment({ client, attributes, references }: PostCommentArgs) {
    try {
      this.log.debug(`Attempting to POST a new comment`);
      return await client.create(CASE_COMMENT_SAVED_OBJECT, attributes, { references });
    } catch (error) {
      this.log.error(`Error on POST a new comment: ${error}`);
      throw error;
    }
  }
  public async patchCase({ client, caseId, updatedAttributes, version }: PatchCaseArgs) {
    try {
      this.log.debug(`Attempting to UPDATE case ${caseId}`);
      return await client.update(CASE_SAVED_OBJECT, caseId, { ...updatedAttributes }, { version });
    } catch (error) {
      this.log.error(`Error on UPDATE case ${caseId}: ${error}`);
      throw error;
    }
  }
  public async patchCases({ client, cases }: PatchCasesArgs) {
    try {
      this.log.debug(`Attempting to UPDATE case ${cases.map((c) => c.caseId).join(', ')}`);
      return await client.bulkUpdate(
        cases.map((c) => ({
          type: CASE_SAVED_OBJECT,
          id: c.caseId,
          attributes: c.updatedAttributes,
          version: c.version,
        }))
      );
    } catch (error) {
      this.log.error(`Error on UPDATE case ${cases.map((c) => c.caseId).join(', ')}: ${error}`);
      throw error;
    }
  }
  public async patchComment({ client, commentId, updatedAttributes, version }: UpdateCommentArgs) {
    try {
      this.log.debug(`Attempting to UPDATE comment ${commentId}`);
      return await client.update(
        CASE_COMMENT_SAVED_OBJECT,
        commentId,
        {
          ...updatedAttributes,
        },
        { version }
      );
    } catch (error) {
      this.log.error(`Error on UPDATE comment ${commentId}: ${error}`);
      throw error;
    }
  }
  public async patchComments({ client, comments }: PatchComments) {
    try {
      this.log.debug(
        `Attempting to UPDATE comments ${comments.map((c) => c.commentId).join(', ')}`
      );
      return await client.bulkUpdate(
        comments.map((c) => ({
          type: CASE_COMMENT_SAVED_OBJECT,
          id: c.commentId,
          attributes: c.updatedAttributes,
          version: c.version,
        }))
      );
    } catch (error) {
      this.log.error(
        `Error on UPDATE comments ${comments.map((c) => c.commentId).join(', ')}: ${error}`
      );
      throw error;
    }
  }
  public async patchSubCase({ client, subCaseId, updatedAttributes, version }: PatchSubCase) {
    try {
      this.log.debug(`Attempting to UPDATE sub case ${subCaseId}`);
      return await client.update(
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

  public async patchSubCases({ client, subCases }: PatchSubCases) {
    try {
      this.log.debug(
        `Attempting to UPDATE sub case ${subCases.map((c) => c.subCaseId).join(', ')}`
      );
      return await client.bulkUpdate(
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
