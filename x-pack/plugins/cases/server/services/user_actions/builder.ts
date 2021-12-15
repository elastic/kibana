/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'kibana/server';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  SUB_CASE_SAVED_OBJECT,
} from '../../../common/constants';
import {
  Actions,
  ActionTypes,
  CaseStatuses,
  User,
  UserActionTypes,
  UserAction,
  CaseExternalServiceBasic,
  noneConnectorId,
  CaseSettings,
  CaseConnector,
  CasePostRequest,
  CommentUserAction,
  ConnectorUserAction,
  ConnectorUserActionWithoutConnectorId,
  CreateCaseUserActionWithoutConnectorId,
  DeleteCaseUserAction,
  DescriptionUserAction,
  PushedUserAction,
  PushedUserActionWithoutConnectorId,
  SettingsUserAction,
  StatusUserAction,
  TagsUserAction,
  TitleUserAction,
} from '../../../common/api';

import {
  CASE_REF_NAME,
  COMMENT_REF_NAME,
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
  SUB_CASE_REF_NAME,
} from '../../common/constants';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';
import { CommonArguments } from './types';

interface BuilderReturnValue<T> {
  attributes: T;
  references: SavedObjectReference[];
}

type CommonBuilderArguments = CommonArguments & {
  action: UserAction;
  type: UserActionTypes;
  value: unknown;
  valueKey: string;
  extraReferences?: SavedObjectReference[];
};

type BuilderFieldTypes = UserActionTypes;

// Title
type TitleBuilderArgs = { title: string } & CommonArguments;
type TitleBuilderResponse = BuilderReturnValue<TitleUserAction>;

// Description
type DescriptionBuilderArgs = { description: string } & CommonArguments;
type DescriptionBuilderResponse = BuilderReturnValue<DescriptionUserAction>;

// Status
type StatusBuilderArgs = { status: CaseStatuses } & CommonArguments;
type StatusBuilderResponse = BuilderReturnValue<StatusUserAction>;

// Tags
type TagsBuilderArgs = { action: UserAction; tags: string[] } & CommonArguments;
type TagsBuilderResponse = BuilderReturnValue<TagsUserAction>;

// Pushed
type PushedBuilderArgs = {
  externalService: PushedUserAction['payload']['externalService'];
} & CommonArguments;
type PushedBuilderResponse = BuilderReturnValue<PushedUserActionWithoutConnectorId>;

// Settings
type SettingsBuilderArgs = { settings: CaseSettings } & CommonArguments;
type SettingsBuilderResponse = BuilderReturnValue<SettingsUserAction>;

// Attachments
type AttachmentBuilderArgs = {
  action: UserAction;
  comment: CommentUserAction['payload']['comment'];
  attachmentId: string;
} & CommonArguments;
type AttachmentBuilderResponse = BuilderReturnValue<CommentUserAction>;

// Connector
type ConnectorBuilderArgs = {
  connector: ConnectorUserAction['payload']['connector'];
} & CommonArguments;
type ConnectorBuilderResponse = BuilderReturnValue<ConnectorUserActionWithoutConnectorId>;

// Create case
type CreateCaseBuilderArgs = {
  payload: CasePostRequest;
} & CommonArguments;
type CreateCaseBuilderResponse = BuilderReturnValue<CreateCaseUserActionWithoutConnectorId>;

// Create case
type DeleteCaseBuilderArgs = { connectorId: string } & CommonArguments;
type DeleteCaseBuilderResponse = BuilderReturnValue<DeleteCaseUserAction>;

type BuilderArgumentsType<T extends BuilderFieldTypes> = T extends 'title'
  ? TitleBuilderArgs
  : T extends 'description'
  ? DescriptionBuilderArgs
  : T extends 'status'
  ? StatusBuilderArgs
  : T extends 'tags'
  ? TagsBuilderArgs
  : T extends 'pushed'
  ? PushedBuilderArgs
  : T extends 'settings'
  ? SettingsBuilderArgs
  : T extends 'comment'
  ? AttachmentBuilderArgs
  : T extends 'connector'
  ? ConnectorBuilderArgs
  : T extends 'create_case'
  ? CreateCaseBuilderArgs
  : T extends 'delete_case'
  ? DeleteCaseBuilderArgs
  : never;

type BuilderResponseType<T extends BuilderFieldTypes> = T extends 'title'
  ? TitleBuilderResponse
  : T extends 'description'
  ? DescriptionBuilderResponse
  : T extends 'status'
  ? StatusBuilderResponse
  : T extends 'tags'
  ? TagsBuilderResponse
  : T extends 'pushed'
  ? PushedBuilderResponse
  : T extends 'settings'
  ? SettingsBuilderResponse
  : T extends 'comment'
  ? AttachmentBuilderResponse
  : T extends 'connector'
  ? ConnectorBuilderResponse
  : T extends 'create_case'
  ? CreateCaseBuilderResponse
  : T extends 'delete_case'
  ? DeleteCaseBuilderResponse
  : never;

type BuilderFunc<T extends BuilderFieldTypes> = (
  args: BuilderArgumentsType<T>
) => BuilderResponseType<T>;

export class UserActionBuilder {
  private readonly builderMap: Map<BuilderFieldTypes, BuilderFunc<BuilderFieldTypes>>;

  private getCommonUserActionAttributes({ user, owner }: { user: User; owner: string }) {
    return {
      created_at: new Date().toISOString(),
      created_by: user,
      owner,
    };
  }

  constructor() {
    this.builderMap = new Map();
    this.buildMap();
  }

  private buildMap() {
    this.builderMap.set('title', this.buildTitleUserAction as BuilderFunc<'title'>);
    this.builderMap.set('comment', this.buildCommentUserAction as BuilderFunc<'comment'>);
    this.builderMap.set('connector', this.buildConnectorUserAction as BuilderFunc<'connector'>);
    this.builderMap.set(
      'description',
      this.buildDescriptionUserAction as BuilderFunc<'description'>
    );
    this.builderMap.set('pushed', this.buildPushedUserAction as BuilderFunc<'pushed'>);
    this.builderMap.set('tags', this.buildTagsUserAction as BuilderFunc<'tags'>);
    this.builderMap.set('status', this.buildStatusUserAction as BuilderFunc<'status'>);
    this.builderMap.set('settings', this.buildSettingsUserAction as BuilderFunc<'settings'>);
    this.builderMap.set(
      'create_case',
      this.buildCreateCaseUserAction as BuilderFunc<'create_case'>
    );
    this.builderMap.set(
      'delete_case',
      this.buildDeleteCaseUserAction as BuilderFunc<'delete_case'>
    );
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

  private extractConnectorId(connector: CaseConnector): Omit<CaseConnector, 'id'> {
    const { id, ...restConnector } = connector;
    return restConnector;
  }

  private extractConnectorIdFromExternalService(
    externalService: CaseExternalServiceBasic
  ): Omit<CaseExternalServiceBasic, 'connector_id'> {
    const { connector_id: connectorId, ...restExternalService } = externalService;
    return restExternalService;
  }

  private createActionReference(id: string | null, name: string) {
    return id != null && id !== noneConnectorId
      ? [{ id, type: ACTION_SAVED_OBJECT_TYPE, name }]
      : [];
  }

  private createCommentReferences(commentId: string): SavedObjectReference[] {
    return [
      {
        type: CASE_COMMENT_SAVED_OBJECT,
        name: COMMENT_REF_NAME,
        id: commentId,
      },
    ];
  }

  private createConnectorReference(id: string | null) {
    return this.createActionReference(id, CONNECTOR_ID_REFERENCE_NAME);
  }

  private createConnectorPushReference(id: string | null) {
    return this.createActionReference(id, PUSH_CONNECTOR_ID_REFERENCE_NAME);
  }

  private buildCommonUserAction = <T extends BuilderFieldTypes>({
    action,
    user,
    owner,
    value,
    valueKey,
    caseId,
    subCaseId,
    type,
    extraReferences = [],
  }: CommonBuilderArguments): BuilderResponseType<T> => {
    return {
      attributes: {
        ...this.getCommonUserActionAttributes({ user, owner }),
        action,
        payload: { [valueKey]: value },
        type,
      },
      references: [...this.createCaseReferences(caseId, subCaseId), ...extraReferences],
    } as BuilderResponseType<T>;
  };

  private buildTitleUserAction(args: TitleBuilderArgs): TitleBuilderResponse {
    return this.buildCommonUserAction<'title'>({
      ...args,
      action: Actions.update,
      valueKey: 'title',
      value: args.title,
      type: ActionTypes.title,
    });
  }

  private buildConnectorUserAction(args: ConnectorBuilderArgs): ConnectorBuilderResponse {
    return this.buildCommonUserAction<'connector'>({
      ...args,
      action: Actions.update,
      valueKey: 'connector',
      value: this.extractConnectorId(args.connector),
      type: ActionTypes.connector,
      extraReferences: this.createConnectorReference(args.connector.id),
    });
  }

  private buildCommentUserAction(args: AttachmentBuilderArgs): AttachmentBuilderResponse {
    return this.buildCommonUserAction<'comment'>({
      ...args,
      valueKey: 'comment',
      value: args.comment,
      type: ActionTypes.comment,
      extraReferences: this.createCommentReferences(args.attachmentId),
    });
  }

  private buildDescriptionUserAction(args: DescriptionBuilderArgs): DescriptionBuilderResponse {
    return this.buildCommonUserAction<'description'>({
      ...args,
      action: Actions.update,
      valueKey: 'description',
      type: ActionTypes.description,
      value: args.description,
    });
  }

  private buildPushedUserAction(args: PushedBuilderArgs): PushedBuilderResponse {
    return this.buildCommonUserAction<'pushed'>({
      ...args,
      action: Actions.push_to_service,
      valueKey: 'externalService',
      value: this.extractConnectorIdFromExternalService(args.externalService),
      type: ActionTypes.pushed,
      extraReferences: this.createConnectorPushReference(args.externalService.connector_id),
    });
  }

  private buildTagsUserAction(args: TagsBuilderArgs): TagsBuilderResponse {
    return this.buildCommonUserAction<'tags'>({
      ...args,
      valueKey: 'tags',
      value: args.tags,
      type: ActionTypes.tags,
    });
  }

  private buildStatusUserAction(args: StatusBuilderArgs): StatusBuilderResponse {
    return this.buildCommonUserAction<'status'>({
      ...args,
      action: Actions.update,
      valueKey: 'status',
      value: args.status,
      type: ActionTypes.status,
    });
  }

  private buildSettingsUserAction(args: SettingsBuilderArgs): SettingsBuilderResponse {
    return this.buildCommonUserAction<'settings'>({
      ...args,
      action: Actions.update,
      valueKey: 'settings',
      value: args.settings,
      type: ActionTypes.settings,
    });
  }

  private buildCreateCaseUserAction(args: CreateCaseBuilderArgs): CreateCaseBuilderResponse {
    const { payload, caseId, subCaseId, owner, user } = args;
    const connectorWithoutId = this.extractConnectorId(payload.connector);
    return {
      attributes: {
        ...this.getCommonUserActionAttributes({ user, owner }),
        action: Actions.create,
        payload: { ...payload, connector: connectorWithoutId, status: CaseStatuses.open },
        type: ActionTypes.create_case,
      },
      references: [
        ...this.createCaseReferences(caseId, subCaseId),
        ...this.createConnectorReference(payload.connector.id),
      ],
    } as CreateCaseBuilderResponse;
  }

  private buildDeleteCaseUserAction(args: DeleteCaseBuilderArgs): DeleteCaseBuilderResponse {
    const { caseId, owner, user, connectorId } = args;
    return {
      attributes: {
        ...this.getCommonUserActionAttributes({ user, owner }),
        action: Actions.delete,
        payload: null,
        type: ActionTypes.delete_case,
      },
      references: [
        ...this.createCaseReferences(caseId),
        ...this.createConnectorReference(connectorId),
      ],
    };
  }

  public buildUserAction<T extends BuilderFieldTypes>(
    field: BuilderFieldTypes,
    args: BuilderArgumentsType<T>
  ): BuilderResponseType<T> | null {
    return this.builderMap.get(field)?.call(this, args) ?? null;
  }
}
