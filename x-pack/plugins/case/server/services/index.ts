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
import { CaseAttributes, CommentAttributes, SavedObjectFindOptions, User } from '../../common/api';
import { CASE_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT } from '../saved_object_types';
import { readReporters } from './reporters/read_reporters';
import { readTags } from './tags/read_tags';

export { CaseConfigureService, CaseConfigureServiceSetup } from './configure';
export { CaseUserActionService, CaseUserActionServiceSetup } from './user_actions';

export interface ClientArgs {
  client: SavedObjectsClientContract;
}

interface PushedArgs {
  pushed_at: string;
  pushed_by: User;
}

interface GetCaseArgs extends ClientArgs {
  caseId: string;
}

interface GetCasesArgs extends ClientArgs {
  caseIds: string[];
}

interface FindCommentsArgs extends GetCaseArgs {
  options?: SavedObjectFindOptions;
}

interface FindCasesArgs extends ClientArgs {
  options?: SavedObjectFindOptions;
}
interface GetCommentArgs extends ClientArgs {
  commentId: string;
}

interface PostCaseArgs extends ClientArgs {
  attributes: CaseAttributes;
}

interface PostCommentArgs extends ClientArgs {
  attributes: CommentAttributes;
  references: SavedObjectReference[];
}

interface PatchCase {
  caseId: string;
  updatedAttributes: Partial<CaseAttributes & PushedArgs>;
  version?: string;
}
type PatchCaseArgs = PatchCase & ClientArgs;

interface PatchCasesArgs extends ClientArgs {
  cases: PatchCase[];
}
interface UpdateCommentArgs extends ClientArgs {
  commentId: string;
  updatedAttributes: Partial<CommentAttributes>;
  version?: string;
}

interface PatchComment {
  commentId: string;
  updatedAttributes: Partial<CommentAttributes>;
  version?: string;
}

interface PatchComments extends ClientArgs {
  comments: PatchComment[];
}

interface GetUserArgs {
  request: KibanaRequest;
  response: KibanaResponseFactory;
}

interface CaseServiceDeps {
  authentication: SecurityPluginSetup['authc'] | null;
}
export interface CaseServiceSetup {
  deleteCase(args: GetCaseArgs): Promise<{}>;
  deleteComment(args: GetCommentArgs): Promise<{}>;
  findCases(args: FindCasesArgs): Promise<SavedObjectsFindResponse<CaseAttributes>>;
  getAllCaseComments(args: FindCommentsArgs): Promise<SavedObjectsFindResponse<CommentAttributes>>;
  getCase(args: GetCaseArgs): Promise<SavedObject<CaseAttributes>>;
  getCases(args: GetCasesArgs): Promise<SavedObjectsBulkResponse<CaseAttributes>>;
  getComment(args: GetCommentArgs): Promise<SavedObject<CommentAttributes>>;
  getTags(args: ClientArgs): Promise<string[]>;
  getReporters(args: ClientArgs): Promise<User[]>;
  getUser(args: GetUserArgs): Promise<AuthenticatedUser | User>;
  postNewCase(args: PostCaseArgs): Promise<SavedObject<CaseAttributes>>;
  postNewComment(args: PostCommentArgs): Promise<SavedObject<CommentAttributes>>;
  patchCase(args: PatchCaseArgs): Promise<SavedObjectsUpdateResponse<CaseAttributes>>;
  patchCases(args: PatchCasesArgs): Promise<SavedObjectsBulkUpdateResponse<CaseAttributes>>;
  patchComment(args: UpdateCommentArgs): Promise<SavedObjectsUpdateResponse<CommentAttributes>>;
  patchComments(args: PatchComments): Promise<SavedObjectsBulkUpdateResponse<CommentAttributes>>;
}

export class CaseService {
  constructor(private readonly log: Logger) {}
  public setup = async ({ authentication }: CaseServiceDeps): Promise<CaseServiceSetup> => ({
    deleteCase: async ({ client, caseId }: GetCaseArgs) => {
      try {
        this.log.debug(`Attempting to GET case ${caseId}`);
        return await client.delete(CASE_SAVED_OBJECT, caseId);
      } catch (error) {
        this.log.debug(`Error on GET case ${caseId}: ${error}`);
        throw error;
      }
    },
    deleteComment: async ({ client, commentId }: GetCommentArgs) => {
      try {
        this.log.debug(`Attempting to GET comment ${commentId}`);
        return await client.delete(CASE_COMMENT_SAVED_OBJECT, commentId);
      } catch (error) {
        this.log.debug(`Error on GET comment ${commentId}: ${error}`);
        throw error;
      }
    },
    getCase: async ({ client, caseId }: GetCaseArgs) => {
      try {
        this.log.debug(`Attempting to GET case ${caseId}`);
        return await client.get(CASE_SAVED_OBJECT, caseId);
      } catch (error) {
        this.log.debug(`Error on GET case ${caseId}: ${error}`);
        throw error;
      }
    },
    getCases: async ({ client, caseIds }: GetCasesArgs) => {
      try {
        this.log.debug(`Attempting to GET cases ${caseIds.join(', ')}`);
        return await client.bulkGet(
          caseIds.map((caseId) => ({ type: CASE_SAVED_OBJECT, id: caseId }))
        );
      } catch (error) {
        this.log.debug(`Error on GET cases ${caseIds.join(', ')}: ${error}`);
        throw error;
      }
    },
    getComment: async ({ client, commentId }: GetCommentArgs) => {
      try {
        this.log.debug(`Attempting to GET comment ${commentId}`);
        return await client.get(CASE_COMMENT_SAVED_OBJECT, commentId);
      } catch (error) {
        this.log.debug(`Error on GET comment ${commentId}: ${error}`);
        throw error;
      }
    },
    findCases: async ({ client, options }: FindCasesArgs) => {
      try {
        this.log.debug(`Attempting to GET all cases`);
        return await client.find({ ...options, type: CASE_SAVED_OBJECT });
      } catch (error) {
        this.log.debug(`Error on GET cases: ${error}`);
        throw error;
      }
    },
    getAllCaseComments: async ({ client, caseId, options }: FindCommentsArgs) => {
      try {
        this.log.debug(`Attempting to GET all comments for case ${caseId}`);
        return await client.find({
          ...options,
          type: CASE_COMMENT_SAVED_OBJECT,
          hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        });
      } catch (error) {
        this.log.debug(`Error on GET all comments for case ${caseId}: ${error}`);
        throw error;
      }
    },
    getReporters: async ({ client }: ClientArgs) => {
      try {
        this.log.debug(`Attempting to GET all reporters`);
        return await readReporters({ client });
      } catch (error) {
        this.log.debug(`Error on GET all reporters: ${error}`);
        throw error;
      }
    },
    getTags: async ({ client }: ClientArgs) => {
      try {
        this.log.debug(`Attempting to GET all cases`);
        return await readTags({ client });
      } catch (error) {
        this.log.debug(`Error on GET cases: ${error}`);
        throw error;
      }
    },
    getUser: async ({ request, response }: GetUserArgs) => {
      try {
        this.log.debug(`Attempting to authenticate a user`);
        if (authentication != null) {
          const user = authentication.getCurrentUser(request);
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
    },
    postNewCase: async ({ client, attributes }: PostCaseArgs) => {
      try {
        this.log.debug(`Attempting to POST a new case`);
        return await client.create(CASE_SAVED_OBJECT, { ...attributes });
      } catch (error) {
        this.log.debug(`Error on POST a new case: ${error}`);
        throw error;
      }
    },
    postNewComment: async ({ client, attributes, references }: PostCommentArgs) => {
      try {
        this.log.debug(`Attempting to POST a new comment`);
        return await client.create(CASE_COMMENT_SAVED_OBJECT, attributes, { references });
      } catch (error) {
        this.log.debug(`Error on POST a new comment: ${error}`);
        throw error;
      }
    },
    patchCase: async ({ client, caseId, updatedAttributes, version }: PatchCaseArgs) => {
      try {
        this.log.debug(`Attempting to UPDATE case ${caseId}`);
        return await client.update(
          CASE_SAVED_OBJECT,
          caseId,
          { ...updatedAttributes },
          { version }
        );
      } catch (error) {
        this.log.debug(`Error on UPDATE case ${caseId}: ${error}`);
        throw error;
      }
    },
    patchCases: async ({ client, cases }: PatchCasesArgs) => {
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
    },
    patchComment: async ({ client, commentId, updatedAttributes, version }: UpdateCommentArgs) => {
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
    },
    patchComments: async ({ client, comments }: PatchComments) => {
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
    },
  });
}
