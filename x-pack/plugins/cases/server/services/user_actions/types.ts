/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectReference,
  SavedObjectsClientContract,
  Logger,
  ISavedObjectsSerializer,
  SavedObjectsRawDoc,
} from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import type { AuditLogger } from '@kbn/security-plugin/server';
import type {
  UserActionAction,
  CaseUserActionWithoutReferenceIds,
  CommentUserAction,
  ConnectorUserAction,
  PushedUserAction,
  UserActionType,
  CaseSettings,
  CaseSeverity,
  CaseStatuses,
  User,
  CaseAssignees,
  CaseCustomFields,
} from '../../../common/types/domain';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import type {
  UserActionPersistedAttributes,
  UserActionSavedObjectTransformed,
} from '../../common/types/user_actions';
import type { IndexRefresh } from '../types';
import type { PatchCasesArgs } from '../cases/types';
import type {
  AttachmentRequest,
  CasePostRequest,
  UserActionFindRequest,
} from '../../../common/types/api';

export interface BuilderParameters {
  title: {
    parameters: { payload: { title: string } };
  };
  description: {
    parameters: { payload: { description: string } };
  };
  status: {
    parameters: { payload: { status: CaseStatuses } };
  };
  severity: {
    parameters: { payload: { severity: CaseSeverity } };
  };
  tags: {
    parameters: { payload: { tags: string[] } };
  };
  assignees: {
    parameters: { payload: { assignees: CaseAssignees } };
  };
  pushed: {
    parameters: {
      payload: {
        externalService: PushedUserAction['payload']['externalService'];
      };
    };
  };
  settings: {
    parameters: { payload: { settings: CaseSettings } };
  };
  comment: {
    parameters: {
      payload: { attachment: CommentUserAction['payload']['comment'] };
    };
  };
  connector: {
    parameters: {
      payload: {
        connector: ConnectorUserAction['payload']['connector'];
      };
    };
  };
  create_case: {
    parameters: {
      payload: CasePostRequest;
    };
  };
  delete_case: {
    parameters: { payload: {} };
  };
  category: {
    parameters: { payload: { category: string | null } };
  };
  customFields: {
    parameters: { payload: { customFields: CaseCustomFields } };
  };
}

export interface CreateUserAction<T extends keyof BuilderParameters> {
  type: T;
  payload: BuilderParameters[T]['parameters']['payload'];
}

export type UserActionParameters<T extends keyof BuilderParameters> =
  BuilderParameters[T]['parameters'] & CommonArguments;

export interface CommonArguments {
  user: User;
  caseId: string;
  owner: string;
  attachmentId?: string;
  connectorId?: string;
  action?: UserActionAction;
}

export interface Attributes {
  action: UserActionAction;
  created_at: string;
  created_by: User;
  owner: string;
  type: UserActionType;
  payload: Record<string, unknown>;
}

export interface SavedObjectParameters {
  attributes: UserActionPersistedAttributes;
  references: SavedObjectReference[];
}

export interface EventDetails {
  getMessage: (storedUserActionId?: string) => string;
  action: UserActionAction;
  descriptiveAction: string;
  savedObjectId: string;
  savedObjectType: string;
}

export interface UserActionEvent {
  parameters: SavedObjectParameters;
  eventDetails: EventDetails;
}

export type CommonBuilderArguments = CommonArguments & {
  action: UserActionAction;
  type: UserActionType;
  value: unknown;
  valueKey: string;
};

export interface BuilderDeps {
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
}

export interface ServiceContext {
  log: Logger;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  savedObjectsSerializer: ISavedObjectsSerializer;
  auditLogger: AuditLogger;
}

export interface PushTimeFrameInfo {
  mostRecent: UserActionSavedObjectTransformed;
  oldest: UserActionSavedObjectTransformed;
}

export interface CaseConnectorActivity {
  connectorId: string;
  fields: UserActionSavedObjectTransformed;
  push?: PushTimeFrameInfo;
}

export type CaseConnectorFields = Map<string, UserActionSavedObjectTransformed>;

export interface PushInfo {
  date: Date;
  connectorId: string;
}

export interface UserActionItem {
  attributes: CaseUserActionWithoutReferenceIds;
  references: SavedObjectReference[];
}

export interface TopHits {
  hits: {
    total: number;
    hits: SavedObjectsRawDoc[];
  };
}

export interface TimeFrameInfo {
  mostRecent: TopHits;
  oldest: TopHits;
}

export interface ConnectorActivityAggsResult {
  references: {
    connectors: {
      ids: {
        buckets: Array<{
          key: string;
          reverse: {
            connectorActivity: {
              buckets: {
                changeConnector: TimeFrameInfo;
                createCase: TimeFrameInfo;
                pushInfo: TimeFrameInfo;
              };
            };
          };
        }>;
      };
    };
  };
}

export interface ConnectorFieldsBeforePushAggsResult {
  references: {
    connectors: {
      reverse: {
        ids: {
          buckets: Record<string, TimeFrameInfo>;
        };
      };
    };
  };
}

export interface UserActionsStatsAggsResult {
  total: number;
  totals: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

export interface MultipleCasesUserActionsTotalAggsResult {
  references: {
    caseUserActions: {
      buckets: Array<{
        key: string;
        doc_count: number;
      }>;
    };
  };
}

export interface ParticipantsAggsResult {
  participants: {
    buckets: Array<{
      key: string;
      docs: {
        hits: {
          hits: SavedObjectsRawDoc[];
        };
      };
    }>;
  };
  assignees: {
    buckets: Array<{
      key: string;
    }>;
  };
}

export interface GetUsersResponse {
  participants: Array<{ id: string; owner: string; user: User }>;
  assignedAndUnassignedUsers: Set<string>;
}

export interface FindOptions extends UserActionFindRequest {
  caseId: string;
  filter?: KueryNode;
}

export type CommonUserActionArgs = CommonArguments;

export interface GetUserActionItemByDifference extends CommonUserActionArgs {
  field: string;
  originalValue: unknown;
  newValue: unknown;
}

export interface TypedUserActionDiffedItems<T> extends GetUserActionItemByDifference {
  originalValue: T[];
  newValue: T[];
}

export type CreatePayloadFunction<Item, ActionType extends UserActionType> = (
  items: Item[]
) => UserActionParameters<ActionType>['payload'];

export interface BuildUserActionsDictParams {
  updatedCases: PatchCasesArgs;
  user: User;
}

export type UserActionsDict = Record<string, UserActionEvent[]>;

export interface BulkCreateBulkUpdateCaseUserActions extends IndexRefresh {
  builtUserActions: UserActionEvent[];
}

export interface BulkCreateAttachmentUserAction
  extends Omit<CommonUserActionArgs, 'owner'>,
    IndexRefresh {
  attachments: Array<{ id: string; owner: string; attachment: AttachmentRequest }>;
}

export type CreateUserActionArgs<T extends keyof BuilderParameters> = {
  userAction: CreateUserAction<T> & CommonUserActionArgs;
} & IndexRefresh;

export type BulkCreateUserActionArgs<T extends keyof BuilderParameters> = {
  userActions: Array<CreateUserAction<T> & CommonUserActionArgs>;
} & IndexRefresh;

export interface CreateUserActionES<T> extends IndexRefresh {
  attributes: T;
  references: SavedObjectReference[];
}

export interface PostCaseUserActionArgs extends IndexRefresh {
  actions: UserActionEvent[];
}
