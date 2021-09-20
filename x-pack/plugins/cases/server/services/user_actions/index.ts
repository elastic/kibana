/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectReference } from 'kibana/server';

import {
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  CaseUserActionAttributes,
  MAX_DOCS_PER_PAGE,
  SUB_CASE_SAVED_OBJECT,
} from '../../../common';
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

export class CaseUserActionService {
  constructor(private readonly log: Logger) {}

  public async getAll({ unsecuredSavedObjectsClient, caseId, subCaseId }: GetCaseUserActionArgs) {
    try {
      const id = subCaseId ?? caseId;
      const type = subCaseId ? SUB_CASE_SAVED_OBJECT : CASE_SAVED_OBJECT;

      return await unsecuredSavedObjectsClient.find<CaseUserActionAttributes>({
        type: CASE_USER_ACTION_SAVED_OBJECT,
        hasReference: { type, id },
        page: 1,
        perPage: MAX_DOCS_PER_PAGE,
        sortField: 'action_at',
        sortOrder: 'asc',
      });
    } catch (error) {
      this.log.error(`Error on GET case user action case id: ${caseId}: ${error}`);
      throw error;
    }
  }

  public async bulkCreate({ unsecuredSavedObjectsClient, actions }: PostCaseUserActionArgs) {
    try {
      this.log.debug(`Attempting to POST a new case user action`);

      return await unsecuredSavedObjectsClient.bulkCreate<CaseUserActionAttributes>(
        actions.map((action) => ({ type: CASE_USER_ACTION_SAVED_OBJECT, ...action }))
      );
    } catch (error) {
      this.log.error(`Error on POST a new case user action: ${error}`);
      throw error;
    }
  }
}
