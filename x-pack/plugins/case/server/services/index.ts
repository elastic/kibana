/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
  SavedObjectReference,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsBulkResponse,
} from 'kibana/server';

import { AuthenticatedUser, SecurityPluginSetup } from '../../../security/server';
import {
  ESCaseAttributes,
  CommentAttributes,
  SavedObjectFindOptions,
  User,
  CommentPatchAttributes,
  SubCaseAttributes,
  AssociationType,
} from '../../common/api';
import { combineFilters } from '../routes/api/cases/helpers';
import { transformNewSubCase } from '../routes/api/utils';
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

interface GetCommentArgs extends ClientArgs {
  commentId: string;
}

interface PostCaseArgs extends ClientArgs {
  attributes: ESCaseAttributes;
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
  response?: KibanaResponseFactory;
}

// TODO: split this up into comments, case, sub case, possibly more?
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
  createSubCase(
    client: SavedObjectsClientContract,
    createdAt: string,
    caseId: string
  ): Promise<SavedObject<SubCaseAttributes>>;
  patchSubCase(args: PatchSubCase): Promise<SavedObjectsUpdateResponse<SubCaseAttributes>>;
  patchSubCases(args: PatchSubCases): Promise<SavedObjectsBulkUpdateResponse<SubCaseAttributes>>;
}

export class CaseService implements CaseServiceSetup {
  constructor(
    private readonly log: Logger,
    private readonly authentication?: SecurityPluginSetup['authc']
  ) {}

  public async createSubCase(
    client: SavedObjectsClientContract,
    createdAt: string,
    caseId: string
  ): Promise<SavedObject<SubCaseAttributes>> {
    try {
      this.log.debug(`Attempting to POST a new sub case`);
      return client.create(SUB_CASE_SAVED_OBJECT, transformNewSubCase(createdAt), {
        references: [
          {
            type: CASE_SAVED_OBJECT,
            name: `associated-${CASE_SAVED_OBJECT}`,
            id: caseId,
          },
        ],
      });
    } catch (error) {
      this.log.debug(`Error on POST a new sub case: ${error}`);
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
      this.log.debug(`Error finding the most recent sub case for case: ${caseId}`);
      throw error;
    }
  }

  public async deleteSubCase(client: SavedObjectsClientContract, id: string) {
    try {
      this.log.debug(`Attempting to DELETE sub case ${id}`);
      return await client.delete(SUB_CASE_SAVED_OBJECT, id);
    } catch (error) {
      this.log.debug(`Error on DELETE sub case ${id}: ${error}`);
      throw error;
    }
  }

  public async deleteCase({ client, id: caseId }: GetCaseArgs) {
    try {
      this.log.debug(`Attempting to DELETE case ${caseId}`);
      return await client.delete(CASE_SAVED_OBJECT, caseId);
    } catch (error) {
      this.log.debug(`Error on DELETE case ${caseId}: ${error}`);
      throw error;
    }
  }
  public async deleteComment({ client, commentId }: GetCommentArgs) {
    try {
      this.log.debug(`Attempting to GET comment ${commentId}`);
      return await client.delete(CASE_COMMENT_SAVED_OBJECT, commentId);
    } catch (error) {
      this.log.debug(`Error on GET comment ${commentId}: ${error}`);
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
      this.log.debug(`Error on GET case ${caseId}: ${error}`);
      throw error;
    }
  }
  public async getSubCase({ client, id }: GetCaseArgs): Promise<SavedObject<SubCaseAttributes>> {
    try {
      this.log.debug(`Attempting to GET sub case ${id}`);
      return await client.get(SUB_CASE_SAVED_OBJECT, id);
    } catch (error) {
      this.log.debug(`Error on GET sub case ${id}: ${error}`);
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
      this.log.debug(`Error on GET cases ${ids.join(', ')}: ${error}`);
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
      this.log.debug(`Error on GET cases ${caseIds.join(', ')}: ${error}`);
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
      this.log.debug(`Error on GET comment ${commentId}: ${error}`);
      throw error;
    }
  }

  public async findCases({
    client,
    options,
  }: FindCasesArgs): Promise<SavedObjectsFindResponse<ESCaseAttributes>> {
    try {
      this.log.debug(`Attempting to find cases`);
      return await client.find({ ...options, type: CASE_SAVED_OBJECT });
    } catch (error) {
      this.log.debug(`Error on find cases: ${error}`);
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
          ...options,
          type: SUB_CASE_SAVED_OBJECT,
        });
      }

      const stats = await client.find({
        fields: [],
        page: 1,
        perPage: 1,
        ...options,
        type: SUB_CASE_SAVED_OBJECT,
      });
      return client.find({
        page: 1,
        perPage: stats.total,
        ...options,
        type: SUB_CASE_SAVED_OBJECT,
      });
    } catch (error) {
      this.log.debug(`Error on find sub cases: ${error}`);
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
      this.log.debug(
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
      this.log.debug(`Attempting to GET all comments for id ${id}`);
      if (options?.page !== undefined || options?.perPage !== undefined) {
        return client.find({
          type: CASE_COMMENT_SAVED_OBJECT,
          ...options,
        });
      }
      // get the total number of comments that are in ES then we'll grab them all in one go
      const stats = await client.find({
        type: CASE_COMMENT_SAVED_OBJECT,
        fields: [],
        page: 1,
        perPage: 1,
        // spread the options after so the caller can override the default behavior if they want
        ...options,
      });

      return client.find({
        type: CASE_COMMENT_SAVED_OBJECT,
        page: 1,
        perPage: stats.total,
        ...options,
      });
    } catch (error) {
      this.log.debug(`Error on GET all comments for ${id}: ${error}`);
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

      this.log.debug(`Attempting to GET all comments for case caseID ${id}`);
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
      this.log.debug(`Error on GET all comments for case ${id}: ${error}`);
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

      this.log.debug(`Attempting to GET all comments for sub case caseID ${id}`);
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
      this.log.debug(`Error on GET all comments for sub case ${id}: ${error}`);
      throw error;
    }
  }

  public async getReporters({ client }: ClientArgs) {
    try {
      this.log.debug(`Attempting to GET all reporters`);
      return await readReporters({ client });
    } catch (error) {
      this.log.debug(`Error on GET all reporters: ${error}`);
      throw error;
    }
  }
  public async getTags({ client }: ClientArgs) {
    try {
      this.log.debug(`Attempting to GET all cases`);
      return await readTags({ client });
    } catch (error) {
      this.log.debug(`Error on GET cases: ${error}`);
      throw error;
    }
  }
  public async getUser({ request, response }: GetUserArgs) {
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
      this.log.debug(`Error on GET cases: ${error}`);
      throw error;
    }
  }
  public async postNewCase({ client, attributes }: PostCaseArgs) {
    try {
      this.log.debug(`Attempting to POST a new case`);
      return await client.create(CASE_SAVED_OBJECT, { ...attributes });
    } catch (error) {
      this.log.debug(`Error on POST a new case: ${error}`);
      throw error;
    }
  }
  public async postNewComment({ client, attributes, references }: PostCommentArgs) {
    try {
      this.log.debug(`Attempting to POST a new comment`);
      return await client.create(CASE_COMMENT_SAVED_OBJECT, attributes, { references });
    } catch (error) {
      this.log.debug(`Error on POST a new comment: ${error}`);
      throw error;
    }
  }
  public async patchCase({ client, caseId, updatedAttributes, version }: PatchCaseArgs) {
    try {
      this.log.debug(`Attempting to UPDATE case ${caseId}`);
      return await client.update(CASE_SAVED_OBJECT, caseId, { ...updatedAttributes }, { version });
    } catch (error) {
      this.log.debug(`Error on UPDATE case ${caseId}: ${error}`);
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
      this.log.debug(`Error on UPDATE case ${cases.map((c) => c.caseId).join(', ')}: ${error}`);
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
      this.log.debug(`Error on UPDATE comment ${commentId}: ${error}`);
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
      this.log.debug(
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
      this.log.debug(`Error on UPDATE sub case ${subCaseId}: ${error}`);
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
      this.log.debug(
        `Error on UPDATE sub case ${subCases.map((c) => c.subCaseId).join(', ')}: ${error}`
      );
      throw error;
    }
  }
}
