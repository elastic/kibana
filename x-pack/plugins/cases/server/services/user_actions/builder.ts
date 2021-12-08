/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'kibana/server';
import { CASE_SAVED_OBJECT, SUB_CASE_SAVED_OBJECT } from '../../../common/constants';
import { Actions, User, UserActionFieldType } from '../../../common/api';

import { CASE_REF_NAME, SUB_CASE_REF_NAME } from '../../common/constants';

type BuilderFunction = () => void;
interface CommonArguments {
  user: User;
  caseId: string;
  owner: string;
  subCaseId?: string;
}

type BuildTitleArguments = { title: string } & CommonArguments;

export class UserActionBuilder {
  private builderMap: Map<UserActionFieldType, BuilderFunction> = new Map();

  private getCommonUserActionAttributes({ user, owner }: { user: User; owner: string }) {
    return {
      created_at: new Date().toISOString(),
      created_by: user,
      owner,
    };
  }

  constructor() {
    this.builderMap.set('title', this.buildTitleUserAction);
    this.builderMap.set('comment', this.buildCommentUserAction);
    this.builderMap.set('connector', this.buildConnectorUserAction);
    this.builderMap.set('description', this.buildDescriptionUserAction);
    this.builderMap.set('pushed', this.buildPushedUserAction);
    this.builderMap.set('tags', this.buildTagsUserAction);
    this.builderMap.set('status', this.buildStatusUserAction);
    this.builderMap.set('settings', this.buildSettingsUserAction);
  }

  private createCaseReferences(caseId: string, subCaseId?: string): SavedObjectReference[] {
    return [
      {
        type: CASE_SAVED_OBJECT,
        name: CASE_REF_NAME,
        id: caseId,
      },
      ...(subCaseId
        ? [
            {
              type: SUB_CASE_SAVED_OBJECT,
              name: SUB_CASE_REF_NAME,
              id: subCaseId,
            },
          ]
        : []),
    ];
  }

  private buildTitleUserAction({ user, owner, caseId, subCaseId, title }: BuildTitleArguments) {
    return {
      attributes: {
        ...this.getCommonUserActionAttributes({ user, owner }),
        action: Actions.update,
        fields: ['title'],
        payload: { title },
      },
      references: this.createCaseReferences(caseId, subCaseId),
    };
  }
  private buildCommentUserAction() {}
  private buildConnectorUserAction() {}
  private buildDescriptionUserAction() {}
  private buildPushedUserAction() {}
  private buildTagsUserAction() {}
  private buildStatusUserAction() {}
  private buildSettingsUserAction() {}

  public buildUserAction(field: UserActionFieldType) {
    return this.builderMap.get(field)?.() ?? null;
  }
}
