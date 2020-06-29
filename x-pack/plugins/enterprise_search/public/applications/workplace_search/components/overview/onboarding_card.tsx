/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import classNames from 'classnames';

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
import { useRoutes } from '../shared/use_routes';
import { sendTelemetry } from '../../../shared/telemetry';
import { KibanaContext, IKibanaContext } from '../../../index';
import { formatTestSubj } from '../../../shared/format_test_subj';

interface IOnboardingCardProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  actionTitle: string;
  actionPath?: string;
  complete?: boolean;
}

export const OnboardingCard: React.FC<IOnboardingCardProps> = ({
  title,
  icon,
  description,
  actionTitle,
  actionPath,
  complete,
}) => {
  const { http } = useContext(KibanaContext) as IKibanaContext;
  const cardClass = classNames('euiCard--isSelectable', {
    'euiCard-isSelected euiCard--isSelectable--success': complete,
  });
  const { getWSRoute } = useRoutes();
  const actionRoute = getWSRoute(actionPath);
  const iconType = complete ? 'checkInCircleFilled' : (icon as IconType);

  const onClick = () =>
    sendTelemetry({
      http,
      product: 'workplace_search',
      action: 'clicked',
      metric: 'onboarding_card_button',
    });

  const emptyButtonProps = {
    onClick,
    target: '_blank',
    href: actionRoute,
    'data-test-subj': `${formatTestSubj(actionTitle)}Button`,
  } as EuiButtonEmptyProps & EuiLinkProps;

  const fillButtonProps = {
    ...emptyButtonProps,
    color: 'secondary',
    fill: true,
  } as EuiButtonProps & EuiLinkProps;

  return (
    <EuiFlexItem>
      <EuiPanel className={`euiPanel ${complete ? '' : 'euiPanel--inset'}`}>
        <EuiEmptyPrompt
          iconType={iconType}
          iconColor={`${complete ? 'secondary' : 'subdued'}`}
          title={<h3>{title}</h3>}
          body={description}
          className={cardClass}
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
