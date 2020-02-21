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
} from 'kibana/server';
import { CASE_COMMENT_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../constants';
import {
  CaseAttributes,
  CommentAttributes,
  SavedObjectsFindOptionsType,
  UpdatedCaseType,
  UpdatedCommentType,
} from '../routes/api/types';
import { AuthenticatedUser, SecurityPluginSetup } from '../../../security/server';
import { readTags } from './tags/read_tags';

interface ClientArgs {
  client: SavedObjectsClientContract;
}

interface GetCaseArgs extends ClientArgs {
  caseId: string;
}

interface GetCasesArgs extends ClientArgs {
  options?: SavedObjectsFindOptionsType;
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
interface UpdateCaseArgs extends ClientArgs {
  caseId: string;
  updatedAttributes: UpdatedCaseType;
}
interface UpdateCommentArgs extends ClientArgs {
  commentId: string;
  updatedAttributes: UpdatedCommentType;
}

interface GetUserArgs {
  request: KibanaRequest;
  response: KibanaResponseFactory;
}

interface CaseServiceDeps {
  authentication: SecurityPluginSetup['authc'];
}
export interface CaseServiceSetup {
  deleteCase(args: GetCaseArgs): Promise<{}>;
  deleteComment(args: GetCommentArgs): Promise<{}>;
  getAllCases(args: GetCasesArgs): Promise<SavedObjectsFindResponse<CaseAttributes>>;
  getAllCaseComments(args: GetCaseArgs): Promise<SavedObjectsFindResponse<CommentAttributes>>;
  getCase(args: GetCaseArgs): Promise<SavedObject<CaseAttributes>>;
  getComment(args: GetCommentArgs): Promise<SavedObject<CommentAttributes>>;
  getTags(args: ClientArgs): Promise<string[]>;
  getUser(args: GetUserArgs): Promise<AuthenticatedUser>;
  postNewCase(args: PostCaseArgs): Promise<SavedObject<CaseAttributes>>;
  postNewComment(args: PostCommentArgs): Promise<SavedObject<CommentAttributes>>;
  updateCase(args: UpdateCaseArgs): Promise<SavedObjectsUpdateResponse<CaseAttributes>>;
  updateComment(args: UpdateCommentArgs): Promise<SavedObjectsUpdateResponse<CommentAttributes>>;
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
    getComment: async ({ client, commentId }: GetCommentArgs) => {
      try {
        this.log.debug(`Attempting to GET comment ${commentId}`);
        return await client.get(CASE_COMMENT_SAVED_OBJECT, commentId);
      } catch (error) {
        this.log.debug(`Error on GET comment ${commentId}: ${error}`);
        throw error;
      }
    },
    getAllCases: async ({ client, options }: GetCasesArgs) => {
      try {
        this.log.debug(`Attempting to GET all cases`);
        return await client.find({ ...options, type: CASE_SAVED_OBJECT });
      } catch (error) {
        this.log.debug(`Error on GET cases: ${error}`);
        throw error;
      }
    },
    getAllCaseComments: async ({ client, caseId }: GetCaseArgs) => {
      try {
        this.log.debug(`Attempting to GET all comments for case ${caseId}`);
        return await client.find({
          type: CASE_COMMENT_SAVED_OBJECT,
          hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        });
      } catch (error) {
        this.log.debug(`Error on GET all comments for case ${caseId}: ${error}`);
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
      let user;
      try {
        this.log.debug(`Attempting to authenticate a user`);
        user = await authentication!.getCurrentUser(request);
      } catch (error) {
        this.log.debug(`Error on GET user: ${error}`);
        throw error;
      }
      if (!user) {
        this.log.debug(`Error on GET user: Bad User`);
        throw new Error('Bad User - the user is not authenticated');
      }
      return user;
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
    updateCase: async ({ client, caseId, updatedAttributes }: UpdateCaseArgs) => {
      try {
        this.log.debug(`Attempting to UPDATE case ${caseId}`);
        return await client.update(CASE_SAVED_OBJECT, caseId, { ...updatedAttributes });
      } catch (error) {
        this.log.debug(`Error on UPDATE case ${caseId}: ${error}`);
        throw error;
      }
    },
    updateComment: async ({ client, commentId, updatedAttributes }: UpdateCommentArgs) => {
      try {
        this.log.debug(`Attempting to UPDATE comment ${commentId}`);
        return await client.update(CASE_COMMENT_SAVED_OBJECT, commentId, {
          ...updatedAttributes,
        });
      } catch (error) {
        this.log.debug(`Error on UPDATE comment ${commentId}: ${error}`);
        throw error;
      }
    },
  });
}
