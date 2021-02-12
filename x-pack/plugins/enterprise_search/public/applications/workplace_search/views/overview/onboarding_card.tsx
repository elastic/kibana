/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiPanel,
  EuiEmptyPrompt,
  IconType,
} from '@elastic/eui';

import { EuiButtonTo, EuiButtonEmptyTo } from '../../../shared/react_router_helpers';
import { TelemetryLogic } from '../../../shared/telemetry';

interface OnboardingCardProps {
  title: React.ReactNode;
  icon: React.ReactNode;
  description: React.ReactNode;
  actionTitle: React.ReactNode;
  testSubj: string;
  actionPath?: string;
  complete?: boolean;
}

export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  title,
  icon,
  description,
  actionTitle,
  testSubj,
  actionPath,
  complete,
}) => {
  const { sendWorkplaceSearchTelemetry } = useActions(TelemetryLogic);

  const onClick = () =>
    sendWorkplaceSearchTelemetry({
      action: 'clicked',
      metric: 'onboarding_card_button',
    });

  const completeButton = actionPath ? (
    <EuiButtonEmptyTo to={actionPath} data-test-subj={testSubj} onClick={onClick}>
      {actionTitle}
    </EuiButtonEmptyTo>
  ) : (
    <EuiButtonEmpty data-test-subj={testSubj}>{actionTitle}</EuiButtonEmpty>
  );

  const incompleteButton = actionPath ? (
    <EuiButtonTo to={actionPath} data-test-subj={testSubj} onClick={onClick}>
      {actionTitle}
    </EuiButtonTo>
  ) : (
    <EuiButton data-test-subj={testSubj}>{actionTitle}</EuiButton>
  );

  return (
    <EuiFlexItem>
      <EuiPanel>
        <EuiEmptyPrompt
          iconType={complete ? 'checkInCircleFilled' : (icon as IconType)}
          iconColor={complete ? 'secondary' : 'subdued'}
          title={<h3>{title}</h3>}
          body={description}
          actions={complete ? completeButton : incompleteButton}
        />
      </EuiPanel>
    </EuiFlexItem>
  );
};
