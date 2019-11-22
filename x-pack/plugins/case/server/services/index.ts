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
} from 'kibana/server';
import { CASE_COMMENT_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../constants';
import {
  NewCaseFormatted,
  NewCommentFormatted,
  UpdatedCaseFormatted,
  UpdatedCommentType,
} from '../routes/api/types';
import { PluginSetupContract as SecurityPluginSetup } from '../../../security/server/plugin';

interface ClientArgs {
  client: SavedObjectsClientContract;
}

interface GetCaseArgs extends ClientArgs {
  caseId: string;
}
interface GetCommentArgs extends ClientArgs {
  commentId: string;
}
interface PostCaseArgs extends ClientArgs {
  attributes: NewCaseFormatted;
}
interface PostCommentArgs extends ClientArgs {
  attributes: NewCommentFormatted;
}
interface UpdateCaseArgs extends ClientArgs {
  caseId: string;
  updatedAttributes: UpdatedCaseFormatted;
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
  authentication: SecurityPluginSetup['authc'] | null;
}
export interface CaseServiceSetup {
  deleteCase(args: GetCaseArgs): Promise<{}>;
  deleteComment(args: GetCommentArgs): Promise<{}>;
  getAllCases(args: ClientArgs): Promise<SavedObjectsFindResponse>;
  getAllCaseComments(args: GetCaseArgs): Promise<SavedObjectsFindResponse>;
  getCase(args: GetCaseArgs): Promise<SavedObject>;
  getComment(args: GetCommentArgs): Promise<SavedObject>;
  getUser(args: GetUserArgs): Promise<any>;
  postNewCase(args: PostCaseArgs): Promise<any>;
  postNewComment(args: PostCommentArgs): Promise<any>;
  updateCase(args: UpdateCaseArgs): Promise<any>;
  updateComment(args: UpdateCommentArgs): Promise<any>;
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
    getAllCases: async ({ client }: ClientArgs) => {
      try {
        this.log.debug(`Attempting to GET all cases`);
        return await client.find({ type: CASE_SAVED_OBJECT });
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
          search: caseId,
          searchFields: ['case_workflow_id'],
        });
      } catch (error) {
        this.log.debug(`Error on GET all comments for case ${caseId}: ${error}`);
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
        throw response.badRequest({
          body: {
            message: 'Bad User - the user is not authenticated',
            attributes: {
              requestBody: request.body,
            },
          },
        });
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
    postNewComment: async ({ client, attributes }: PostCommentArgs) => {
      try {
        this.log.debug(`Attempting to POST a new comment`);
        return await client.create(CASE_COMMENT_SAVED_OBJECT, { ...attributes });
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
