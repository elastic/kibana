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
import { CaseExternalService, Comment } from '../../../common/ui/types';
import {
  ActionConnector,
  CaseStatuses,
  CommentType,
  CommentRequestActionsType,
  NONE_CONNECTOR_ID,
  Actions,
  ConnectorUserAction,
  PushedUserAction,
  TagsUserAction,
} from '../../../common/api';
import { CaseUserActions } from '../../containers/types';
import { CaseServices } from '../../containers/use_get_case_user_actions';
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
import {
  isCommentUserAction,
  isDescriptionUserAction,
  isStatusUserAction,
  isTagsUserAction,
  isTitleUserAction,
} from '../../../common/utils/user_actions';
import { SnakeToCamelCase } from '../../../common/types';

interface LabelTitle {
  action: CaseUserActions;
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

export const getLabelTitle = ({ action }: LabelTitle) => {
  if (isTagsUserAction(action)) {
    return getTagsLabelTitle(action);
  } else if (isTitleUserAction(action)) {
    return `${i18n.CHANGED_FIELD.toLowerCase()} ${i18n.CASE_NAME.toLowerCase()}  ${i18n.TO} "${
      action.payload.title
    }"`;
  } else if (isDescriptionUserAction(action) && action.action === Actions.update) {
    return `${i18n.EDITED_FIELD} ${i18n.DESCRIPTION.toLowerCase()}`;
  } else if (isStatusUserAction(action)) {
    const status = action.payload.status ?? '';
    if (isStatusValid(status)) {
      return getStatusTitle(action.actionId, status);
    }

    return '';
  } else if (isCommentUserAction(action) && action.action === Actions.update) {
    return `${i18n.EDITED_FIELD} ${i18n.COMMENT.toLowerCase()}`;
  }

  return '';
};

export const getConnectorLabelTitle = ({
  action,
  connectors,
}: {
  action: ConnectorUserAction;
  connectors: ActionConnector[];
}) => {
  const connector = action.payload.connector;

  if (connector == null) {
    return '';
  }

  // ids are not the same so check and see if the id is a valid connector and then return its name
  // if the connector id is the none connector value then it must have been removed
  const newConnectorActionInfo = connectors.find((c) => c.id === connector.id);
  if (connector.id !== NONE_CONNECTOR_ID && newConnectorActionInfo != null) {
    return i18n.SELECTED_THIRD_PARTY(newConnectorActionInfo.name);
  }

  // it wasn't a valid connector or it was the none connector, so it must have been removed
  return i18n.REMOVED_THIRD_PARTY;
};

const getTagsLabelTitle = (action: TagsUserAction) => {
  const tags = action.payload.tags ?? [];

  return (
    <EuiFlexGroup alignItems="baseline" gutterSize="xs" component="span" responsive={false}>
      <EuiFlexItem data-test-subj="ua-tags-label" grow={false}>
        {action.action === Actions.add && i18n.ADDED_FIELD}
        {action.action === Actions.delete && i18n.REMOVED_FIELD} {i18n.TAGS.toLowerCase()}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Tags tags={tags} gutterSize="xs" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const getPushedServiceLabelTitle = (
  action: SnakeToCamelCase<PushedUserAction>,
  firstPush: boolean
) => {
  const externalService = action.payload.externalService;

  return (
    <EuiFlexGroup
      alignItems="baseline"
      gutterSize="xs"
      data-test-subj="pushed-service-label-title"
      responsive={false}
    >
      <EuiFlexItem data-test-subj="pushed-label">
        {`${firstPush ? i18n.PUSHED_NEW_INCIDENT : i18n.UPDATE_INCIDENT} ${
          externalService?.connectorName
        }`}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink data-test-subj="pushed-value" href={externalService?.externalUrl} target="_blank">
          {externalService?.externalTitle}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const getPushInfo = (
  caseServices: CaseServices,
  externalService: CaseExternalService | undefined,
  index: number
) =>
  externalService != null && externalService.connectorId !== NONE_CONNECTOR_ID
    ? {
        firstPush: caseServices[externalService.connectorId]?.firstPushIndex === index,
        parsedConnectorId: externalService.connectorId,
        parsedConnectorName: externalService.connectorName,
      }
    : {
        firstPush: false,
        parsedConnectorId: NONE_CONNECTOR_ID,
        parsedConnectorName: NONE_CONNECTOR_ID,
      };

const getUpdateActionIcon = (fields: string): string => {
  if (fields === 'tags') {
    return 'tag';
  } else if (fields === 'status') {
    return 'folderClosed';
  }

  return 'dot';
};

export const getUpdateAction = ({
  action,
  label,
  handleOutlineComment,
}: {
  action: CaseUserActions;
  label: string | JSX.Element;
  handleOutlineComment: (id: string) => void;
}): EuiCommentProps => ({
  username: (
    <UserActionUsernameWithAvatar
      username={action.createdBy.username}
      fullName={action.createdBy.fullName}
    />
  ),
  type: 'update',
  event: label,
  'data-test-subj': `${action.type}-${action.action}-action-${action.actionId}`,
  timestamp: <UserActionTimestamp createdAt={action.createdAt} />,
  timelineIcon: getUpdateActionIcon(action.type),
  actions: (
    <EuiFlexGroup responsive={false}>
      <EuiFlexItem grow={false}>
        <UserActionCopyLink id={action.actionId} />
      </EuiFlexItem>
      {action.action === Actions.update && action.commentId != null && (
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
      username={action.createdBy.username}
      fullName={action.createdBy.fullName}
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
  'data-test-subj': `${action.type}-${action.action}-action-${action.actionId}`,
  timestamp: <UserActionTimestamp createdAt={action.createdAt} />,
  timelineIcon: 'bell',
  actions: (
    <EuiFlexGroup responsive={false}>
      <EuiFlexItem grow={false}>
        <UserActionCopyLink id={action.actionId} />
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

export const getGeneratedAlertsAttachment = ({
  action,
  alertIds,
  getRuleDetailsHref,
  onRuleDetailsClick,
  renderInvestigateInTimelineActionComponent,
  ruleId,
  ruleName,
}: {
  action: CaseUserActions;
  alertIds: string[];
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
  'data-test-subj': `${action.type}-${action.action}-action-${action.actionId}`,
  timestamp: <UserActionTimestamp createdAt={action.createdAt} />,
  timelineIcon: 'bell',
  actions: (
    <EuiFlexGroup responsive={false}>
      <EuiFlexItem grow={false}>
        <UserActionCopyLink id={action.actionId} />
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

ActionIcon.displayName = 'ActionIcon';

export const getActionAttachment = ({
  comment,
  userCanCrud,
  isLoadingIds,
  actionsNavigation,
  action,
}: {
  comment: Comment & CommentRequestActionsType;
  userCanCrud: boolean;
  isLoadingIds: string[];
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
  timestamp: <UserActionTimestamp createdAt={action.createdAt} />,
  timelineIcon: <ActionIcon actionType={comment.actions.type} />,
  actions: <UserActionCopyLink id={comment.id} />,
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
