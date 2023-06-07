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
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import type { AuditLogger } from '@kbn/security-plugin/server';
import type { CaseAssignees } from '../../../common/api/cases/assignee';
import type {
  ActionTypeValues,
  CaseAttributes,
  CasePostRequest,
  CaseSettings,
  CaseSeverity,
  CaseStatuses,
  CaseUserActionWithoutReferenceIds,
  CommentRequest,
  CommentUserAction,
  ConnectorUserAction,
  PushedUserAction,
  User,
  ActionCategory,
  UserActionFindRequest,
  UserActionTypes,
} from '../../../common/api';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import type {
  UserActionPersistedAttributes,
  UserActionSavedObjectTransformed,
} from '../../common/types/user_actions';
import type { IndexRefresh } from '../types';
import type { CaseSavedObjectTransformed } from '../../common/types/case';

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
  action?: ActionCategory;
}

export interface Attributes {
  action: ActionCategory;
  created_at: string;
  created_by: User;
  owner: string;
  type: UserActionTypes;
  payload: Record<string, unknown>;
}

export interface SavedObjectParameters {
  attributes: UserActionPersistedAttributes;
  references: SavedObjectReference[];
}

export interface EventDetails {
  getMessage: (storedUserActionId?: string) => string;
  action: ActionCategory;
  descriptiveAction: string;
  savedObjectId: string;
  savedObjectType: string;
}

export interface UserActionEvent {
  parameters: SavedObjectParameters;
  eventDetails: EventDetails;
}

export type CommonBuilderArguments = CommonArguments & {
  action: ActionCategory;
  type: UserActionTypes;
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

export type CreatePayloadFunction<Item, ActionType extends ActionTypeValues> = (
  items: Item[]
) => UserActionParameters<ActionType>['payload'];

export interface BulkCreateBulkUpdateCaseUserActions extends IndexRefresh {
  originalCases: CaseSavedObjectTransformed[];
  updatedCases: Array<SavedObjectsUpdateResponse<CaseAttributes>>;
  user: User;
}

export interface BulkCreateAttachmentUserAction
  extends Omit<CommonUserActionArgs, 'owner'>,
    IndexRefresh {
  attachments: Array<{ id: string; owner: string; attachment: CommentRequest }>;
}

export type CreateUserActionClient<T extends keyof BuilderParameters> = CreateUserAction<T> &
  CommonUserActionArgs &
  IndexRefresh;

export interface CreateUserActionES<T> extends IndexRefresh {
  attributes: T;
  references: SavedObjectReference[];
}

export interface PostCaseUserActionArgs extends IndexRefresh {
  actions: UserActionEvent[];
}
