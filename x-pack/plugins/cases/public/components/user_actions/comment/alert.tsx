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

export const createAlertAttachmentUserActionBuilder = ({
  userAction,
  comment,
  alertData,
  getRuleDetailsHref,
  loadingAlertData,
  onRuleDetailsClick,
  onShowAlertDetails,
}: BuilderArgs): ReturnType<UserActionBuilder> => ({
  // TODO: Fix this manually. Issue #123375
  // eslint-disable-next-line react/display-name
  build: () => {
    const alertId = getNonEmptyField(comment.alertId);
    const alertIndex = getNonEmptyField(comment.index);

    if (!alertId || !alertIndex) {
      return [];
    }

    const alertField: unknown | undefined = alertData[alertId];
    const ruleId = getRuleId(comment, alertField);
    const ruleName = getRuleName(comment, alertField);

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

const getFirstItem = (items?: string | string[] | null): string | null => {
  return Array.isArray(items) ? items[0] : items ?? null;
};

export const getRuleId = (comment: BuilderArgs['comment'], alertData?: unknown): string | null =>
  getRuleField({
    commentRuleField: comment?.rule?.id,
    alertData,
    signalRuleFieldPath: 'signal.rule.id',
    kibanaAlertFieldPath: ALERT_RULE_UUID,
  });

export const getRuleName = (comment: BuilderArgs['comment'], alertData?: unknown): string | null =>
  getRuleField({
    commentRuleField: comment?.rule?.name,
    alertData,
    signalRuleFieldPath: 'signal.rule.name',
    kibanaAlertFieldPath: ALERT_RULE_NAME,
  });

const getRuleField = ({
  commentRuleField,
  alertData,
  signalRuleFieldPath,
  kibanaAlertFieldPath,
}: {
  commentRuleField: string | string[] | null | undefined;
  alertData: unknown | undefined;
  signalRuleFieldPath: string;
  kibanaAlertFieldPath: string;
}): string | null => {
  const field =
    getNonEmptyField(commentRuleField) ??
    getNonEmptyField(get(alertData, signalRuleFieldPath)) ??
    getNonEmptyField(get(alertData, kibanaAlertFieldPath));

  return field;
};

function getNonEmptyField(field: string | string[] | undefined | null): string | null {
  const firstItem = getFirstItem(field);
  if (firstItem == null || isEmpty(firstItem)) {
    return null;
  }

  return firstItem;
}
