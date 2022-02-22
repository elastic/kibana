/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCommentProps } from '@elastic/eui';
import { SnakeToCamelCase } from '../../../common/types';
import { ActionTypes, UserActionWithResponse } from '../../../common/api';
import { Case, CaseUserActions, Comment, UseFetchAlertData } from '../../containers/types';
import { CaseServices } from '../../containers/use_get_case_user_actions';
import { AddCommentRefObject } from '../add_comment';
import { UserActionMarkdownRefObject } from './markdown_form';
import { CasesNavigation } from '../links';
import { UNSUPPORTED_ACTION_TYPES } from './constants';
import type { OnUpdateFields } from '../case_view/types';

export interface UserActionTreeProps {
  caseServices: CaseServices;
  caseUserActions: CaseUserActions[];
  data: Case;
  fetchUserActions: () => void;
  getRuleDetailsHref?: RuleDetailsNavigation['href'];
  actionsNavigation?: ActionsNavigation;
  isLoadingDescription: boolean;
  isLoadingUserActions: boolean;
  onRuleDetailsClick?: RuleDetailsNavigation['onClick'];
  onShowAlertDetails: (alertId: string, index: string) => void;
  onUpdateField: ({ key, value, onSuccess, onError }: OnUpdateFields) => void;
  statusActionButton: JSX.Element | null;
  updateCase: (newCase: Case) => void;
  useFetchAlertData: UseFetchAlertData;
  userCanCrud: boolean;
}

type UnsupportedUserActionTypes = typeof UNSUPPORTED_ACTION_TYPES[number];
export type SupportedUserActionTypes = keyof Omit<typeof ActionTypes, UnsupportedUserActionTypes>;

export interface UserActionBuilderArgs {
  caseData: Case;
  userAction: CaseUserActions;
  caseServices: CaseServices;
  comments: Comment[];
  index: number;
  userCanCrud: boolean;
  commentRefs: React.MutableRefObject<
    Record<string, AddCommentRefObject | UserActionMarkdownRefObject | null | undefined>
  >;
  manageMarkdownEditIds: string[];
  selectedOutlineCommentId: string;
  loadingCommentIds: string[];
  loadingAlertData: boolean;
  alertData: Record<string, unknown>;
  handleOutlineComment: (id: string) => void;
  handleManageMarkdownEditId: (id: string) => void;
  handleSaveComment: ({ id, version }: { id: string; version: string }, content: string) => void;
  handleManageQuote: (quote: string) => void;
  onShowAlertDetails: (alertId: string, index: string) => void;
  actionsNavigation?: ActionsNavigation;
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
