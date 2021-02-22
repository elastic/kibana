/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsFindResponse,
  Logger,
  SavedObjectsBulkResponse,
  SavedObjectReference,
} from 'kibana/server';

import { CaseUserActionAttributes } from '../../../common/api';
import {
  CASE_USER_ACTION_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  SUB_CASE_SAVED_OBJECT,
} from '../../saved_object_types';
import { ClientArgs } from '..';

interface GetCaseUserActionArgs extends ClientArgs {
  caseId: string;
  subCaseId?: string;
}

export interface UserActionItem {
  attributes: CaseUserActionAttributes;
  references: SavedObjectReference[];
}

interface PostCaseUserActionArgs extends ClientArgs {
  actions: UserActionItem[];
}

export interface CaseUserActionServiceSetup {
  getUserActions(
    args: GetCaseUserActionArgs
  ): Promise<SavedObjectsFindResponse<CaseUserActionAttributes>>;
  postUserActions(
    args: PostCaseUserActionArgs
  ): Promise<SavedObjectsBulkResponse<CaseUserActionAttributes>>;
}

export class CaseUserActionService {
  constructor(private readonly log: Logger) {}
  public setup = async (): Promise<CaseUserActionServiceSetup> => ({
    getUserActions: async ({ client, caseId, subCaseId }: GetCaseUserActionArgs) => {
      try {
        const id = subCaseId ?? caseId;
        const type = subCaseId ? SUB_CASE_SAVED_OBJECT : CASE_SAVED_OBJECT;
        const caseUserActionInfo = await client.find({
          type: CASE_USER_ACTION_SAVED_OBJECT,
          fields: [],
          hasReference: { type, id },
          page: 1,
          perPage: 1,
        });
        return await client.find({
          type: CASE_USER_ACTION_SAVED_OBJECT,
          hasReference: { type, id },
          page: 1,
          perPage: caseUserActionInfo.total,
          sortField: 'action_at',
          sortOrder: 'asc',
        });
      } catch (error) {
        this.log.debug(`Error on GET case user action: ${error}`);
        throw error;
      }
    },
    postUserActions: async ({ client, actions }: PostCaseUserActionArgs) => {
      try {
        this.log.debug(`Attempting to POST a new case user action`);
        return await client.bulkCreate(
          actions.map((action) => ({ type: CASE_USER_ACTION_SAVED_OBJECT, ...action }))
        );
      } catch (error) {
        this.log.debug(`Error on POST a new case user action: ${error}`);
        throw error;
      }
    },
  });
}
