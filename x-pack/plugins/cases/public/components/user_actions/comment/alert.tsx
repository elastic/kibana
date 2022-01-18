/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { get, isEmpty } from 'lodash';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';

import { CommentType, CommentResponseAlertsType } from '../../../../common/api';
import { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { UserActionTimestamp } from '../timestamp';
import { SnakeToCamelCase } from '../../../../common/types';
import { UserActionUsernameWithAvatar } from '../avatar_username';
import { AlertCommentEvent } from './alert_event';
import { UserActionCopyLink } from '../copy_link';
import { UserActionShowAlert } from './show_alert';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  | 'userAction'
  | 'alertData'
  | 'getRuleDetailsHref'
  | 'onRuleDetailsClick'
  | 'loadingAlertData'
  | 'onShowAlertDetails'
> & { comment: SnakeToCamelCase<CommentResponseAlertsType> };

const getFirstItem = (items: string | string[]) =>
  Array.isArray(items) ? (items.length > 0 ? items[0] : '') : items;

export const createAlertAttachmentUserActionBuilder = ({
  userAction,
  comment,
  alertData,
  getRuleDetailsHref,
  loadingAlertData,
  onRuleDetailsClick,
  onShowAlertDetails,
}: BuilderArgs): ReturnType<UserActionBuilder> => ({
  build: () => {
    const alertId = getFirstItem(comment.alertId);
    const alertIndex = getFirstItem(comment.index);

    if (isEmpty(alertId)) {
      return [];
    }

    const ruleId =
      comment?.rule?.id ??
      alertData[alertId]?.signal?.rule?.id?.[0] ??
      get(alertData[alertId], ALERT_RULE_UUID)[0] ??
      null;

    const ruleName =
      comment?.rule?.name ??
      alertData[alertId]?.signal?.rule?.name?.[0] ??
      get(alertData[alertId], ALERT_RULE_NAME)[0] ??
      null;

    return [
      {
        username: (
          <UserActionUsernameWithAvatar
            username={userAction.createdBy.username}
            fullName={userAction.createdBy.fullName}
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
        'data-test-subj': `user-action-alert-${userAction.type}-${userAction.action}-action-${userAction.actionId}`,
        timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
        timelineIcon: 'bell',
        actions: (
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem grow={false}>
              <UserActionCopyLink id={userAction.actionId} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <UserActionShowAlert
                id={userAction.actionId}
                alertId={alertId}
                index={alertIndex}
                onShowAlertDetails={onShowAlertDetails}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
    ];
  },
});
