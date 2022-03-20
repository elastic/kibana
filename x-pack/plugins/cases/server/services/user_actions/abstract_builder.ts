/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'kibana/server';
import { CASE_COMMENT_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import {
  CASE_REF_NAME,
  COMMENT_REF_NAME,
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
} from '../../common/constants';
import {
  ActionTypes,
  CaseConnector,
  CaseExternalServiceBasic,
  NONE_CONNECTOR_ID,
  User,
} from '../../../common/api';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';
import {
  BuilderParameters,
  BuilderReturnValue,
  CommonBuilderArguments,
  UserActionParameters,
} from './types';

export abstract class UserActionBuilder {
  protected getCommonUserActionAttributes({ user, owner }: { user: User; owner: string }) {
    return {
      created_at: new Date().toISOString(),
      created_by: user,
      owner,
    };
  }

  protected extractConnectorId(connector: CaseConnector): Omit<CaseConnector, 'id'> {
    const { id, ...restConnector } = connector;
    return restConnector;
  }

  protected createCaseReferences(caseId: string): SavedObjectReference[] {
    return [
      {
        type: CASE_SAVED_OBJECT,
        name: CASE_REF_NAME,
        id: caseId,
      },
    ];
  }

  protected createActionReference(id: string | null, name: string): SavedObjectReference[] {
    return id != null && id !== NONE_CONNECTOR_ID
      ? [{ id, type: ACTION_SAVED_OBJECT_TYPE, name }]
      : [];
  }

  protected createCommentReferences(id: string | null): SavedObjectReference[] {
    return id != null
      ? [
          {
            type: CASE_COMMENT_SAVED_OBJECT,
            name: COMMENT_REF_NAME,
            id,
          },
        ]
      : [];
  }

  protected createConnectorReference(id: string | null): SavedObjectReference[] {
    return this.createActionReference(id, CONNECTOR_ID_REFERENCE_NAME);
  }

  protected createConnectorPushReference(id: string | null): SavedObjectReference[] {
    return this.createActionReference(id, PUSH_CONNECTOR_ID_REFERENCE_NAME);
  }

  protected extractConnectorIdFromExternalService(
    externalService: CaseExternalServiceBasic
  ): Omit<CaseExternalServiceBasic, 'connector_id'> {
    const { connector_id: connectorId, ...restExternalService } = externalService;
    return restExternalService;
  }

  protected buildCommonUserAction = ({
    action,
    user,
    owner,
    value,
    valueKey,
    caseId,
    attachmentId,
    connectorId,
    type,
  }: CommonBuilderArguments): BuilderReturnValue => {
    return {
      attributes: {
        ...this.getCommonUserActionAttributes({ user, owner }),
        action,
        payload: { [valueKey]: value },
        type,
      },
      references: [
        ...this.createCaseReferences(caseId),
        ...this.createCommentReferences(attachmentId ?? null),
        ...(type === ActionTypes.connector
          ? this.createConnectorReference(connectorId ?? null)
          : []),
        ...(type === ActionTypes.pushed
          ? this.createConnectorPushReference(connectorId ?? null)
          : []),
      ],
    };
  };

  public abstract build<T extends keyof BuilderParameters>(
    args: UserActionParameters<T>
  ): BuilderReturnValue;
}
