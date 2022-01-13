/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentProps, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';

import { Actions, NONE_CONNECTOR_ID, PushedUserAction } from '../../../common/api';
import { UserActionBuilder, UserActionResponse } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import * as i18n from './translations';
import { CaseServices } from '../../containers/use_get_case_user_actions';
import { CaseExternalService } from '../../containers/types';

const getPushInfo = (
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
  caseServices,
  connectorId,
  connectorName,
  index,
}: {
  userAction: UserActionResponse<PushedUserAction>;
  caseServices: CaseServices;
  connectorId: string;
  connectorName: string;
  index: number;
}): EuiCommentProps[] => {
  const showTopFooter =
    userAction.action === Actions.push_to_service &&
    index === caseServices[connectorId]?.lastPushIndex;

  const showBottomFooter =
    userAction.action === Actions.push_to_service &&
    index === caseServices[connectorId]?.lastPushIndex &&
    caseServices[connectorId].hasDataToPush;

  let footers: EuiCommentProps[] = [];

  if (showTopFooter) {
    footers = [
      ...footers,
      {
        username: '',
        type: 'update',
        event: i18n.ALREADY_PUSHED_TO_SERVICE(`${connectorName}`),
        timelineIcon: 'sortUp',
        'data-test-subj': 'top-footer',
      },
    ];
  }

  if (showBottomFooter) {
    footers = [
      ...footers,
      {
        username: '',
        type: 'update',
        event: i18n.REQUIRED_UPDATE_TO_SERVICE(`${connectorName}`),
        timelineIcon: 'sortDown',
        'data-test-subj': 'bottom-footer',
      },
    ];
  }

  return footers;
};

export const createPushedUserActionBuilder: UserActionBuilder = ({
  userAction,
  caseServices,
  index,
  handleOutlineComment,
}) => ({
  build: () => {
    const pushedUserAction = userAction as UserActionResponse<PushedUserAction>;
    const { firstPush, parsedConnectorId, parsedConnectorName } = getPushInfo(
      caseServices,
      pushedUserAction.payload.externalService,
      index
    );

    if (parsedConnectorId === NONE_CONNECTOR_ID) {
      return [];
    }

    const footers = getFooters({
      userAction: pushedUserAction,
      caseServices,
      connectorId: parsedConnectorId,
      connectorName: parsedConnectorName,
      index,
    });

    const label = getLabelTitle(pushedUserAction, firstPush);
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    return [...commonBuilder.build(), ...footers];
  },
});
