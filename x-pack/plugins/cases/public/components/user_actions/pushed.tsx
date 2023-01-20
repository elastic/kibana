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

const isLatestPush = (pushedAt: string, latestPush: string | undefined) => {
  if (!latestPush) {
    return false;
  }

  const pushedDate = new Date(pushedAt);
  const latestPushedDate = new Date(latestPush);

  if (isNaN(pushedDate.getTime()) || isNaN(latestPushedDate.getTime())) {
    return false;
  }

  return pushedDate.getTime() >= latestPushedDate.getTime();
};

const getLabelTitle = (action: UserActionResponse<PushedUserAction>, hasBeenPushed: boolean) => {
  const externalService = action.payload.externalService;

  return (
    <EuiFlexGroup
      alignItems="baseline"
      gutterSize="xs"
      data-test-subj="pushed-service-label-title"
      responsive={false}
    >
      <EuiFlexItem data-test-subj="pushed-label">
        {`${!hasBeenPushed ? i18n.PUSHED_NEW_INCIDENT : i18n.UPDATE_INCIDENT} ${
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

  const showBottomFooter =
    userAction.action === Actions.push_to_service && connectorInfo.needsToBePushed && latestPush;

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
  index,
  handleOutlineComment,
}) => ({
  build: () => {
    const pushedUserAction = userAction as UserActionResponse<PushedUserAction>;
    const connectorId = pushedUserAction.payload.externalService?.connectorId;
    const connectorInfo = caseConnectors[connectorId];

    if (!connectorId || !connectorInfo) {
      return [];
    }

    const footers = getFooters({ userAction: pushedUserAction, connectorInfo });
    const label = getLabelTitle(pushedUserAction, connectorInfo.hasBeenPushed);

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
