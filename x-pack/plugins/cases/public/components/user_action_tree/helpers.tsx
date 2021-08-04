/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiCommentProps,
  EuiToken,
} from '@elastic/eui';
import React, { useContext } from 'react';
import classNames from 'classnames';
import { ThemeContext } from 'styled-components';
import {
  CaseFullExternalService,
  ActionConnector,
  CaseStatuses,
  CommentType,
  Comment,
  CommentRequestActionsType,
} from '../../../common';
import { CaseUserActions } from '../../containers/types';
import { CaseServices } from '../../containers/use_get_case_user_actions';
import { parseString } from '../../containers/utils';
import { Tags } from '../tag_list/tags';
import { UserActionUsernameWithAvatar } from './user_action_username_with_avatar';
import { UserActionTimestamp } from './user_action_timestamp';
import { UserActionCopyLink } from './user_action_copy_link';
import { ContentWrapper } from './user_action_markdown';
import { UserActionMoveToReference } from './user_action_move_to_reference';
import { Status, statuses } from '../status';
import { UserActionShowAlert } from './user_action_show_alert';
import * as i18n from './translations';
import { AlertCommentEvent } from './user_action_alert_comment_event';
import { CasesNavigation } from '../links';
import { HostIsolationCommentEvent } from './user_action_host_isolation_comment_event';
import { MarkdownRenderer } from '../markdown_editor';

interface LabelTitle {
  action: CaseUserActions;
  field: string;
}

export type RuleDetailsNavigation = CasesNavigation<string | null | undefined, 'configurable'>;

export type ActionsNavigation = CasesNavigation<string, 'configurable'>;

const getStatusTitle = (id: string, status: CaseStatuses) => (
  <EuiFlexGroup
    gutterSize="s"
    alignItems="center"
    data-test-subj={`${id}-user-action-status-title`}
    responsive={false}
  >
    <EuiFlexItem grow={false}>{i18n.MARKED_CASE_AS}</EuiFlexItem>
    <EuiFlexItem grow={false}>
      <Status type={status} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const isStatusValid = (status: string): status is CaseStatuses =>
  Object.prototype.hasOwnProperty.call(statuses, status);

export const getLabelTitle = ({ action, field }: LabelTitle) => {
  if (field === 'tags') {
    return getTagsLabelTitle(action);
  } else if (field === 'title' && action.action === 'update') {
    return `${i18n.CHANGED_FIELD.toLowerCase()} ${i18n.CASE_NAME.toLowerCase()}  ${i18n.TO} "${
      action.newValue
    }"`;
  } else if (field === 'description' && action.action === 'update') {
    return `${i18n.EDITED_FIELD} ${i18n.DESCRIPTION.toLowerCase()}`;
  } else if (field === 'status' && action.action === 'update') {
    const status = action.newValue ?? '';
    if (isStatusValid(status)) {
      return getStatusTitle(action.actionId, status);
    }

    return '';
  } else if (field === 'comment' && action.action === 'update') {
    return `${i18n.EDITED_FIELD} ${i18n.COMMENT.toLowerCase()}`;
  }

  return '';
};

export const getConnectorLabelTitle = ({
  action,
  connectors,
}: {
  action: CaseUserActions;
  connectors: ActionConnector[];
}) => {
  const oldValue = parseString(`${action.oldValue}`);
  const newValue = parseString(`${action.newValue}`);

  if (oldValue === null || newValue === null) {
    return '';
  }

  // Connector changed
  if (oldValue.id !== newValue.id) {
    const newConnector = connectors.find((c) => c.id === newValue.id);
    return newValue.id != null && newValue.id !== 'none' && newConnector != null
      ? i18n.SELECTED_THIRD_PARTY(newConnector.name)
      : i18n.REMOVED_THIRD_PARTY;
  } else {
    // Field changed
    return i18n.CHANGED_CONNECTOR_FIELD;
  }
};

const getTagsLabelTitle = (action: CaseUserActions) => {
  const tags = action.newValue != null ? action.newValue.split(',') : [];

  return (
    <EuiFlexGroup alignItems="baseline" gutterSize="xs" component="span" responsive={false}>
      <EuiFlexItem data-test-subj="ua-tags-label" grow={false}>
        {action.action === 'add' && i18n.ADDED_FIELD}
        {action.action === 'delete' && i18n.REMOVED_FIELD} {i18n.TAGS.toLowerCase()}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Tags tags={tags} gutterSize="xs" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const getPushedServiceLabelTitle = (action: CaseUserActions, firstPush: boolean) => {
  const pushedVal = JSON.parse(action.newValue ?? '') as CaseFullExternalService;
  return (
    <EuiFlexGroup
      alignItems="baseline"
      gutterSize="xs"
      data-test-subj="pushed-service-label-title"
      responsive={false}
    >
      <EuiFlexItem data-test-subj="pushed-label">
        {`${firstPush ? i18n.PUSHED_NEW_INCIDENT : i18n.UPDATE_INCIDENT} ${
          pushedVal?.connector_name
        }`}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink data-test-subj="pushed-value" href={pushedVal?.external_url} target="_blank">
          {pushedVal?.external_title}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const getPushInfo = (
  caseServices: CaseServices,
  // a JSON parse failure will result in null for parsedValue
  parsedValue: { connector_id: string | null; connector_name: string } | null,
  index: number
) =>
  parsedValue != null && parsedValue.connector_id != null
    ? {
        firstPush: caseServices[parsedValue.connector_id]?.firstPushIndex === index,
        parsedConnectorId: parsedValue.connector_id,
        parsedConnectorName: parsedValue.connector_name,
      }
    : {
        firstPush: false,
        parsedConnectorId: 'none',
        parsedConnectorName: 'none',
      };

const getUpdateActionIcon = (actionField: string): string => {
  if (actionField === 'tags') {
    return 'tag';
  } else if (actionField === 'status') {
    return 'folderClosed';
  }

  return 'dot';
};

export const getUpdateAction = ({
  action,
  getCaseDetailHrefWithCommentId,
  label,
  handleOutlineComment,
}: {
  action: CaseUserActions;
  getCaseDetailHrefWithCommentId: (commentId: string) => string;
  label: string | JSX.Element;
  handleOutlineComment: (id: string) => void;
}): EuiCommentProps => ({
  username: (
    <UserActionUsernameWithAvatar
      username={action.actionBy.username}
      fullName={action.actionBy.fullName}
    />
  ),
  type: 'update',
  event: label,
  'data-test-subj': `${action.actionField[0]}-${action.action}-action-${action.actionId}`,
  timestamp: <UserActionTimestamp createdAt={action.actionAt} />,
  timelineIcon: getUpdateActionIcon(action.actionField[0]),
  actions: (
    <EuiFlexGroup responsive={false}>
      <EuiFlexItem grow={false}>
        <UserActionCopyLink
          getCaseDetailHrefWithCommentId={getCaseDetailHrefWithCommentId}
          id={action.actionId}
        />
      </EuiFlexItem>
      {action.action === 'update' && action.commentId != null && (
        <EuiFlexItem grow={false}>
          <UserActionMoveToReference id={action.commentId} outlineComment={handleOutlineComment} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  ),
});

export const getAlertAttachment = ({
  action,
  alertId,
  getCaseDetailHrefWithCommentId,
  getRuleDetailsHref,
  index,
  loadingAlertData,
  onRuleDetailsClick,
  onShowAlertDetails,
  ruleId,
  ruleName,
}: {
  action: CaseUserActions;
  alertId: string;
  getCaseDetailHrefWithCommentId: (commentId: string) => string;
  getRuleDetailsHref: RuleDetailsNavigation['href'];
  index: string;
  loadingAlertData: boolean;
  onRuleDetailsClick?: RuleDetailsNavigation['onClick'];
  onShowAlertDetails: (alertId: string, index: string) => void;
  ruleId?: string | null;
  ruleName?: string | null;
}): EuiCommentProps => ({
  username: (
    <UserActionUsernameWithAvatar
      username={action.actionBy.username}
      fullName={action.actionBy.fullName}
    />
  ),
  className: 'comment-alert',
  type: 'update',
  event: (
    <AlertCommentEvent
      alertId={alertId}
      getRuleDetailsHref={getRuleDetailsHref}
      loadingAlertData={loadingAlertData}
      onRuleDetailsClick={onRuleDetailsClick}
      ruleId={ruleId}
      ruleName={ruleName}
      commentType={CommentType.alert}
    />
  ),
  'data-test-subj': `${action.actionField[0]}-${action.action}-action-${action.actionId}`,
  timestamp: <UserActionTimestamp createdAt={action.actionAt} />,
  timelineIcon: 'bell',
  actions: (
    <EuiFlexGroup responsive={false}>
      <EuiFlexItem grow={false}>
        <UserActionCopyLink
          id={action.actionId}
          getCaseDetailHrefWithCommentId={getCaseDetailHrefWithCommentId}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <UserActionShowAlert
          id={action.actionId}
          alertId={alertId}
          index={index}
          onShowAlertDetails={onShowAlertDetails}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  ),
});

export const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.reduce<string[]>((acc, v) => {
      if (v != null) {
        switch (typeof v) {
          case 'number':
          case 'boolean':
            return [...acc, v.toString()];
          case 'object':
            try {
              return [...acc, JSON.stringify(v)];
            } catch {
              return [...acc, 'Invalid Object'];
            }
          case 'string':
            return [...acc, v];
          default:
            return [...acc, `${v}`];
        }
      }
      return acc;
    }, []);
  } else if (value == null) {
    return [];
  } else if (typeof value === 'object') {
    try {
      return [JSON.stringify(value)];
    } catch {
      return ['Invalid Object'];
    }
  } else {
    return [`${value}`];
  }
};

export const getGeneratedAlertsAttachment = ({
  action,
  alertIds,
  getCaseDetailHrefWithCommentId,
  getRuleDetailsHref,
  onRuleDetailsClick,
  renderInvestigateInTimelineActionComponent,
  ruleId,
  ruleName,
}: {
  action: CaseUserActions;
  alertIds: string[];
  getCaseDetailHrefWithCommentId: (commentId: string) => string;
  getRuleDetailsHref: RuleDetailsNavigation['href'];
  onRuleDetailsClick?: RuleDetailsNavigation['onClick'];
  renderInvestigateInTimelineActionComponent?: (alertIds: string[]) => JSX.Element;
  ruleId: string;
  ruleName: string;
}): EuiCommentProps => ({
  username: <EuiIcon type="logoSecurity" size="m" />,
  className: 'comment-alert',
  type: 'update',
  event: (
    <AlertCommentEvent
      alertId={alertIds[0]}
      getRuleDetailsHref={getRuleDetailsHref}
      onRuleDetailsClick={onRuleDetailsClick}
      ruleId={ruleId}
      ruleName={ruleName}
      alertsCount={alertIds.length}
      commentType={CommentType.generatedAlert}
    />
  ),
  'data-test-subj': `${action.actionField[0]}-${action.action}-action-${action.actionId}`,
  timestamp: <UserActionTimestamp createdAt={action.actionAt} />,
  timelineIcon: 'bell',
  actions: (
    <EuiFlexGroup responsive={false}>
      <EuiFlexItem grow={false}>
        <UserActionCopyLink
          getCaseDetailHrefWithCommentId={getCaseDetailHrefWithCommentId}
          id={action.actionId}
        />
      </EuiFlexItem>
      {renderInvestigateInTimelineActionComponent ? (
        <EuiFlexItem grow={false}>
          {renderInvestigateInTimelineActionComponent(alertIds)}
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  ),
});

const ActionIcon = React.memo<{
  actionType: string;
}>(({ actionType }) => {
  const theme = useContext(ThemeContext);
  return (
    <EuiToken
      style={{ marginTop: '8px' }}
      iconType={actionType === 'isolate' ? 'lock' : 'lockOpen'}
      size="m"
      shape="circle"
      color={theme.eui.euiColorLightestShade}
      data-test-subj="endpoint-action-icon"
    />
  );
});

export const getActionAttachment = ({
  comment,
  userCanCrud,
  isLoadingIds,
  getCaseDetailHrefWithCommentId,
  actionsNavigation,
  action,
}: {
  comment: Comment & CommentRequestActionsType;
  userCanCrud: boolean;
  isLoadingIds: string[];
  getCaseDetailHrefWithCommentId: (commentId: string) => string;
  actionsNavigation?: ActionsNavigation;
  action: CaseUserActions;
}): EuiCommentProps => ({
  username: (
    <UserActionUsernameWithAvatar
      username={comment.createdBy.username}
      fullName={comment.createdBy.fullName}
    />
  ),
  className: classNames('comment-action', { 'empty-comment': comment.comment.trim().length === 0 }),
  event: (
    <HostIsolationCommentEvent
      type={comment.actions.type}
      endpoints={comment.actions.targets}
      href={actionsNavigation?.href}
      onClick={actionsNavigation?.onClick}
    />
  ),
  'data-test-subj': 'endpoint-action',
  timestamp: <UserActionTimestamp createdAt={action.actionAt} />,
  timelineIcon: <ActionIcon actionType={comment.actions.type} />,
  actions: (
    <UserActionCopyLink
      id={comment.id}
      getCaseDetailHrefWithCommentId={getCaseDetailHrefWithCommentId}
    />
  ),
  children: comment.comment.trim().length > 0 && (
    <ContentWrapper data-test-subj="user-action-markdown">
      <MarkdownRenderer>{comment.comment}</MarkdownRenderer>
    </ContentWrapper>
  ),
});

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
