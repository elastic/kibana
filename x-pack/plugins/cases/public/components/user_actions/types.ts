/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { SnakeToCamelCase } from '../../../common/types';
import type { ActionTypes, UserActionWithResponse } from '../../../common/api';
import type { Case, CaseUserActions, Comment, UseFetchAlertData } from '../../containers/types';
import type { CaseServices } from '../../containers/use_find_case_user_actions';
import type { AddCommentRefObject } from '../add_comment';
import type { UserActionMarkdownRefObject } from './markdown_form';
import type { CasesNavigation } from '../links';
import type { UNSUPPORTED_ACTION_TYPES } from './constants';
import type { OnUpdateFields } from '../case_view/types';
import type { ExternalReferenceAttachmentTypeRegistry } from '../../client/attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../../client/attachment_framework/persistable_state_registry';
import type { CurrentUserProfile } from '../types';

export interface UserActionTreeProps {
  caseServices: CaseServices;
  caseUserActions: CaseUserActions[];
  userProfiles: Map<string, UserProfileWithAvatar>;
  currentUserProfile: CurrentUserProfile;
  data: Case;
  getRuleDetailsHref?: RuleDetailsNavigation['href'];
  actionsNavigation?: ActionsNavigation;
  isLoadingDescription: boolean;
  isLoadingUserActions: boolean;
  onRuleDetailsClick?: RuleDetailsNavigation['onClick'];
  onShowAlertDetails: (alertId: string, index: string) => void;
  onUpdateField: ({ key, value, onSuccess, onError }: OnUpdateFields) => void;
  statusActionButton: JSX.Element | null;
  useFetchAlertData: UseFetchAlertData;
}

type UnsupportedUserActionTypes = typeof UNSUPPORTED_ACTION_TYPES[number];
export type SupportedUserActionTypes = keyof Omit<typeof ActionTypes, UnsupportedUserActionTypes>;

export interface UserActionBuilderArgs {
  appId?: string;
  caseData: Case;
  userProfiles: Map<string, UserProfileWithAvatar>;
  currentUserProfile: CurrentUserProfile;
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  userAction: CaseUserActions;
  caseServices: CaseServices;
  comments: Comment[];
  index: number;
  commentRefs: React.MutableRefObject<
    Record<string, AddCommentRefObject | UserActionMarkdownRefObject | null | undefined>
  >;
  manageMarkdownEditIds: string[];
  selectedOutlineCommentId: string;
  loadingCommentIds: string[];
  loadingAlertData: boolean;
  alertData: Record<string, unknown>;
  actionsNavigation?: ActionsNavigation;
  handleOutlineComment: (id: string) => void;
  handleManageMarkdownEditId: (id: string) => void;
  handleSaveComment: ({ id, version }: { id: string; version: string }, content: string) => void;
  handleDeleteComment: (id: string) => void;
  handleManageQuote: (quote: string) => void;
  onShowAlertDetails: (alertId: string, index: string) => void;
  getRuleDetailsHref?: RuleDetailsNavigation['href'];
  onRuleDetailsClick?: RuleDetailsNavigation['onClick'];
}

export type UserActionResponse<T> = SnakeToCamelCase<UserActionWithResponse<T>>;
export type UserActionBuilder = (args: UserActionBuilderArgs) => {
  build: () => EuiCommentProps[];
};

export type UserActionBuilderMap = Record<SupportedUserActionTypes, UserActionBuilder>;

export type RuleDetailsNavigation = CasesNavigation<string | null | undefined, 'configurable'>;
export type ActionsNavigation = CasesNavigation<string, 'configurable'>;

interface Signal {
  rule: {
    id: string;
    name: string;
    to: string;
    from: string;
  };
}

export interface Alert {
  _id: string;
  _index: string;
  '@timestamp': string;
  signal: Signal;
  [key: string]: unknown;
}
