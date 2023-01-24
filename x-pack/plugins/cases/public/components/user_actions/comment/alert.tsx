/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { get, isEmpty } from 'lodash';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';

import type { CommentResponseAlertsType } from '../../../../common/api';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { UserActionTimestamp } from '../timestamp';
import type { SnakeToCamelCase } from '../../../../common/types';
import { MultipleAlertsCommentEvent, SingleAlertCommentEvent } from './alert_event';
import { UserActionShowAlert } from './show_alert';
import { ShowAlertTableLink } from './show_alert_table_link';
import { HoverableUserWithAvatarResolver } from '../../user_profiles/hoverable_user_with_avatar_resolver';
import { UserActionContentToolbar } from '../content_toolbar';
import { AlertPropertyActions } from '../property_actions/alert_property_actions';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  | 'userAction'
  | 'alertData'
  | 'getRuleDetailsHref'
  | 'onRuleDetailsClick'
  | 'loadingAlertData'
  | 'onShowAlertDetails'
  | 'userProfiles'
  | 'handleDeleteComment'
  | 'loadingCommentIds'
> & { comment: SnakeToCamelCase<CommentResponseAlertsType> };

const getSingleAlertUserAction = ({
  userAction,
  userProfiles,
  comment,
  alertData,
  loadingAlertData,
  loadingCommentIds,
  getRuleDetailsHref,
  onRuleDetailsClick,
  onShowAlertDetails,
  handleDeleteComment,
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
        <HoverableUserWithAvatarResolver user={userAction.createdBy} userProfiles={userProfiles} />
      ),
      className: 'comment-alert',
      event: (
        <SingleAlertCommentEvent
          actionId={userAction.actionId}
          getRuleDetailsHref={getRuleDetailsHref}
          loadingAlertData={loadingAlertData}
          onRuleDetailsClick={onRuleDetailsClick}
          ruleId={ruleId}
          ruleName={ruleName}
        />
      ),
      'data-test-subj': `user-action-alert-${userAction.type}-${userAction.action}-action-${userAction.actionId}`,
      timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
      timelineAvatar: 'bell',
      actions: (
        <UserActionContentToolbar id={comment.id}>
          <EuiFlexItem grow={false}>
            <UserActionShowAlert
              id={userAction.actionId}
              alertId={alertId}
              index={alertIndex}
              onShowAlertDetails={onShowAlertDetails}
            />
          </EuiFlexItem>
          <AlertPropertyActions
            onDelete={() => handleDeleteComment(comment.id)}
            isLoading={loadingCommentIds.includes(comment.id)}
            totalAlerts={1}
          />
        </UserActionContentToolbar>
      ),
    },
  ];
};

const getMultipleAlertsUserAction = ({
  userAction,
  userProfiles,
  comment,
  alertData,
  loadingAlertData,
  loadingCommentIds,
  getRuleDetailsHref,
  onRuleDetailsClick,
  handleDeleteComment,
}: BuilderArgs): EuiCommentProps[] => {
  if (!Array.isArray(comment.alertId)) {
    return [];
  }

  const totalAlerts = comment.alertId.length;
  const { ruleId, ruleName } = getRuleInfo(comment, alertData);

  return [
    {
      username: (
        <HoverableUserWithAvatarResolver user={userAction.createdBy} userProfiles={userProfiles} />
      ),
      className: 'comment-alert',
      event: (
        <MultipleAlertsCommentEvent
          actionId={userAction.actionId}
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
      timelineAvatar: 'bell',
      actions: (
        <UserActionContentToolbar id={comment.id}>
          <EuiFlexItem grow={false}>
            <ShowAlertTableLink />
          </EuiFlexItem>
          <AlertPropertyActions
            onDelete={() => handleDeleteComment(comment.id)}
            isLoading={loadingCommentIds.includes(comment.id)}
            totalAlerts={totalAlerts}
          />
        </UserActionContentToolbar>
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

export function getRuleInfo(comment: BuilderArgs['comment'], alertData: BuilderArgs['alertData']) {
  const alertId = getNonEmptyField(comment.alertId);

  if (!alertId) {
    return { ruleId: null, ruleName: null };
  }

  const alertField: unknown | undefined = alertData[alertId];
  const ruleId = getRuleId(comment, alertField);
  const ruleName = getRuleName(comment, alertField);

  return { ruleId, ruleName };
}
