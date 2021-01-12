/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiCommentProps, EuiIconTip } from '@elastic/eui';

import {
  CaseFullExternalService,
  ActionConnector,
  CaseStatuses,
} from '../../../../../case/common/api';
import { CaseUserActions } from '../../containers/types';
import { CaseServices } from '../../containers/use_get_case_user_actions';
import { parseString } from '../../containers/utils';
import { Tags } from '../tag_list/tags';
import { UserActionUsernameWithAvatar } from './user_action_username_with_avatar';
import { UserActionTimestamp } from './user_action_timestamp';
import { UserActionCopyLink } from './user_action_copy_link';
import { UserActionMoveToReference } from './user_action_move_to_reference';
import { Status, statuses } from '../status';
import { UserActionShowAlert } from './user_action_show_alert';
import * as i18n from './translations';
import { Alert } from '../case_view';
import { AlertCommentEvent } from './user_action_alert_comment_event';

interface LabelTitle {
  action: CaseUserActions;
  field: string;
}

const getStatusTitle = (id: string, status: CaseStatuses) => {
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems={'center'}
      data-test-subj={`${id}-user-action-status-title`}
    >
      <EuiFlexItem grow={false}>{i18n.MARKED_CASE_AS}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Status type={status} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

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
    <EuiFlexGroup alignItems="baseline" gutterSize="xs" component="span">
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
    <EuiFlexGroup alignItems="baseline" gutterSize="xs" data-test-subj="pushed-service-label-title">
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
  parsedValue: { connector_id: string; connector_name: string },
  index: number
) =>
  parsedValue != null
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
  label,
  handleOutlineComment,
}: {
  action: CaseUserActions;
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
    <EuiFlexGroup>
      <EuiFlexItem>
        <UserActionCopyLink id={action.actionId} />
      </EuiFlexItem>
      {action.action === 'update' && action.commentId != null && (
        <EuiFlexItem>
          <UserActionMoveToReference id={action.commentId} outlineComment={handleOutlineComment} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  ),
});

export const getAlertComment = ({
  action,
  alert,
  onShowAlertDetails,
}: {
  action: CaseUserActions;
  alert: Alert | undefined;
  onShowAlertDetails: (alertId: string, index: string) => void;
}): EuiCommentProps => {
  return {
    username: (
      <UserActionUsernameWithAvatar
        username={action.actionBy.username}
        fullName={action.actionBy.fullName}
      />
    ),
    className: 'comment-alert',
    type: 'update',
    event: <AlertCommentEvent alert={alert} />,
    'data-test-subj': `${action.actionField[0]}-${action.action}-action-${action.actionId}`,
    timestamp: <UserActionTimestamp createdAt={action.actionAt} />,
    timelineIcon: 'bell',
    actions: (
      <EuiFlexGroup>
        <EuiFlexItem>
          <UserActionCopyLink id={action.actionId} />
        </EuiFlexItem>
        <EuiFlexItem>
          {alert != null ? (
            <UserActionShowAlert
              id={action.actionId}
              alert={alert}
              onShowAlertDetails={onShowAlertDetails}
            />
          ) : (
            <EuiIconTip
              aria-label={i18n.ALERT_NOT_FOUND_TOOLTIP}
              size="l"
              type="alert"
              color="danger"
              content={i18n.ALERT_NOT_FOUND_TOOLTIP}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  };
};
