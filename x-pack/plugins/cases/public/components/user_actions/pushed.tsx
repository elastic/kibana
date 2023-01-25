/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';

import type { PushedUserAction } from '../../../common/api';
import { Actions } from '../../../common/api';
import type { UserActionBuilder, UserActionResponse } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import * as i18n from './translations';
import type { CaseConnectors } from '../../containers/types';

const comparePushDates = (
  type: 'firstPush' | 'latestPush',
  pushedAt: string,
  connectorPushedAt: string | undefined
) => {
  if (!connectorPushedAt) {
    return false;
  }

  const pushedDate = new Date(pushedAt);
  const connectorDate = new Date(connectorPushedAt);

  if (isNaN(pushedDate.getTime()) || isNaN(connectorDate.getTime())) {
    return false;
  }

  return type === 'firstPush'
    ? pushedDate.getTime() <= connectorDate.getTime()
    : pushedDate.getTime() >= connectorDate.getTime();
};

const isLatestPush = (pushedAt: string, latestPush: string | undefined) => {
  return comparePushDates('latestPush', pushedAt, latestPush);
};

const isFirstPush = (pushedAt: string, oldestPush: string | undefined) => {
  return comparePushDates('firstPush', pushedAt, oldestPush);
};

const getLabelTitle = (action: UserActionResponse<PushedUserAction>, firstPush: boolean) => {
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

const getFooters = ({
  userAction,
  connectorInfo,
}: {
  userAction: UserActionResponse<PushedUserAction>;
  connectorInfo: CaseConnectors[string];
}): EuiCommentProps[] => {
  const footers: EuiCommentProps[] = [];
  const latestPush = isLatestPush(userAction.createdAt, connectorInfo.latestPushDate);
  const showTopFooter = userAction.action === Actions.push_to_service && latestPush;

  const showBottomFooter = showTopFooter && connectorInfo.needsToBePushed;

  if (showTopFooter) {
    footers.push({
      username: '',
      event: i18n.ALREADY_PUSHED_TO_SERVICE(`${connectorInfo.name}`),
      timelineAvatar: 'sortUp',
      'data-test-subj': 'top-footer',
    });
  }

  if (showBottomFooter) {
    footers.push({
      username: '',
      event: i18n.REQUIRED_UPDATE_TO_SERVICE(`${connectorInfo.name}`),
      timelineAvatar: 'sortDown',
      'data-test-subj': 'bottom-footer',
    });
  }

  return footers;
};

export const createPushedUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  caseConnectors,
  handleOutlineComment,
}) => ({
  build: () => {
    const pushedUserAction = userAction as UserActionResponse<PushedUserAction>;
    const connectorId = pushedUserAction.payload.externalService?.connectorId;
    const connectorInfo = caseConnectors[connectorId];

    if (!connectorId || !connectorInfo) {
      return [];
    }

    const firstPush = isFirstPush(userAction.createdAt, connectorInfo.oldestPushDate);
    const footers = getFooters({ userAction: pushedUserAction, connectorInfo });
    const label = getLabelTitle(pushedUserAction, firstPush);

    const commonBuilder = createCommonUpdateUserActionBuilder({
      userProfiles,
      userAction,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    return [...commonBuilder.build(), ...footers];
  },
});
