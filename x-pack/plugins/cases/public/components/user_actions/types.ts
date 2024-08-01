/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps, EuiThemeComputed } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { UserActionTypes } from '../../../common/types/domain';
import type {
  CaseUI,
  CaseConnectors,
  UserActionUI,
  AttachmentUI,
  UseFetchAlertData,
  CaseUserActionsStats,
  CasesConfigurationUI,
} from '../../containers/types';
import type { AddCommentRefObject } from '../add_comment';
import type { UserActionMarkdownRefObject } from './markdown_form';
import type { CasesNavigation } from '../links';
import type { UNSUPPORTED_ACTION_TYPES } from './constants';
import type { OnUpdateFields } from '../case_view/types';
import type { ExternalReferenceAttachmentTypeRegistry } from '../../client/attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../../client/attachment_framework/persistable_state_registry';
import type { CurrentUserProfile } from '../types';
import type { UserActivityParams } from '../user_actions_activity_bar/types';

export interface UserActionTreeProps {
  caseConnectors: CaseConnectors;
  userProfiles: Map<string, UserProfileWithAvatar>;
  currentUserProfile: CurrentUserProfile;
  data: CaseUI;
  casesConfiguration: CasesConfigurationUI;
  getRuleDetailsHref?: RuleDetailsNavigation['href'];
  actionsNavigation?: ActionsNavigation;
  onRuleDetailsClick?: RuleDetailsNavigation['onClick'];
  onShowAlertDetails?: (alertId: string, index: string) => void;
  onUpdateField: ({ key, value, onSuccess, onError }: OnUpdateFields) => void;
  statusActionButton: JSX.Element | null;
  useFetchAlertData: UseFetchAlertData;
  userActivityQueryParams: UserActivityParams;
  userActionsStats: CaseUserActionsStats;
}

type UnsupportedUserActionTypes = (typeof UNSUPPORTED_ACTION_TYPES)[number];
export type SupportedUserActionTypes = keyof Omit<
  typeof UserActionTypes,
  UnsupportedUserActionTypes
>;

export interface UserActionBuilderArgs {
  appId?: string;
  caseData: CaseUI;
  casesConfiguration: CasesConfigurationUI;
  userProfiles: Map<string, UserProfileWithAvatar>;
  currentUserProfile: CurrentUserProfile;
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  caseConnectors: CaseConnectors;
  userAction: UserActionUI;
  comments: AttachmentUI[];
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
  handleDeleteComment: (id: string, successToasterTitle: string) => void;
  handleManageQuote: (quote: string) => void;
  onShowAlertDetails?: (alertId: string, index: string) => void;
  getRuleDetailsHref?: RuleDetailsNavigation['href'];
  onRuleDetailsClick?: RuleDetailsNavigation['onClick'];
  euiTheme?: EuiThemeComputed<{}>;
}

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
