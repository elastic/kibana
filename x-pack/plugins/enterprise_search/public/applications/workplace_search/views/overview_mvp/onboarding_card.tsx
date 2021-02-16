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
  EuiButtonProps,
  EuiButtonEmptyProps,
  EuiLinkProps,
} from '@elastic/eui';

import { getWorkplaceSearchUrl } from '../../../shared/enterprise_search_url';
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
  const buttonActionProps = actionPath
    ? {
        onClick,
        href: getWorkplaceSearchUrl(actionPath),
        target: '_blank',
        'data-test-subj': testSubj,
      }
    : {
        'data-test-subj': testSubj,
      };

  const emptyButtonProps = {
    ...buttonActionProps,
  } as EuiButtonEmptyProps & EuiLinkProps;
  const fillButtonProps = {
    ...buttonActionProps,
    color: 'secondary',
    fill: true,
  } as EuiButtonProps & EuiLinkProps;

  return (
    <EuiFlexItem>
      <EuiPanel>
        <EuiEmptyPrompt
          iconType={complete ? 'checkInCircleFilled' : (icon as IconType)}
          iconColor={complete ? 'secondary' : 'subdued'}
          title={<h3>{title}</h3>}
          body={description}
          actions={
            complete ? (
              <EuiButtonEmpty {...emptyButtonProps}>{actionTitle}</EuiButtonEmpty>
            ) : (
              <EuiButton {...fillButtonProps}>{actionTitle}</EuiButton>
            )
          }
        />
      </EuiPanel>
    </EuiFlexItem>
  );
};
