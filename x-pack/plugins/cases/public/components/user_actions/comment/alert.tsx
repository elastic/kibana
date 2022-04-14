/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { get, isEmpty } from 'lodash';
import { EuiCommentProps, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';

import { CommentResponseAlertsType } from '../../../../common/api';
import { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { UserActionTimestamp } from '../timestamp';
import { SnakeToCamelCase } from '../../../../common/types';
import { UserActionUsernameWithAvatar } from '../avatar_username';
import { MultipleAlertsCommentEvent, SingleAlertCommentEvent } from './alert_event';
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

const getSingleAlertUserAction = ({
  userAction,
  comment,
  alertData,
  getRuleDetailsHref,
  loadingAlertData,
  onRuleDetailsClick,
  onShowAlertDetails,
}: BuilderArgs): EuiCommentProps[] => {
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
        <SingleAlertCommentEvent
          getRuleDetailsHref={getRuleDetailsHref}
          loadingAlertData={loadingAlertData}
          onRuleDetailsClick={onRuleDetailsClick}
          ruleId={ruleId}
          ruleName={ruleName}
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
};

const getMultipleAlertsUserAction = ({
  userAction,
  comment,
  alertData,
  getRuleDetailsHref,
  loadingAlertData,
  onRuleDetailsClick,
  onShowAlertDetails,
}: BuilderArgs): EuiCommentProps[] => {
  if (!Array.isArray(comment.alertId)) {
    return [];
  }

  const totalAlerts = comment.alertId.length;
  const { ruleId, ruleName } = getRuleInfo(comment, alertData);

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
        <MultipleAlertsCommentEvent
          loadingAlertData={loadingAlertData}
          totalAlerts={totalAlerts}
          ruleId={ruleId}
          ruleName={ruleName}
          getRuleDetailsHref={getRuleDetailsHref}
          onRuleDetailsClick={onRuleDetailsClick}
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
        </EuiFlexGroup>
      ),
    },
  ];
};

export const createAlertAttachmentUserActionBuilder = (
  params: BuilderArgs
): ReturnType<UserActionBuilder> => ({
  build: () => {
    const { comment } = params;
    const alertId = Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];

    if (alertId.length === 1) {
      return getSingleAlertUserAction(params);
    }

    return getMultipleAlertsUserAction(params);
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

function getRuleInfo(comment: BuilderArgs['comment'], alertData: BuilderArgs['alertData']) {
  const alertId = getNonEmptyField(comment.alertId);

  if (!alertId) {
    return { ruleId: null, ruleName: null };
  }

  const alertField: unknown | undefined = alertData[alertId];
  const ruleId = getRuleId(comment, alertField);
  const ruleName = getRuleName(comment, alertField);

  return { ruleId, ruleName };
}
