/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle, useEuiTheme } from '@elastic/eui';

import { css } from '@emotion/react';
import React from 'react';

import type { ProductTier } from '../../../common/product';
import { useWelcomePanel } from './use_welcome_panel';

const WelcomePanelComponent = ({
  totalActiveSteps,
  totalStepsLeft,
  productTier,
}: {
  totalActiveSteps: number | null;
  totalStepsLeft: number | null;
  productTier: ProductTier | undefined;
}) => {
  const { euiTheme } = useEuiTheme();
  const headerCards = useWelcomePanel({
    productTier,
    totalActiveSteps,
    totalStepsLeft,
  });

  return (
    <EuiFlexGroup
      css={css`
        gap: ${euiTheme.size.xl};
        margin-top: 6px;
      `}
    >
      {headerCards.map((item, index) => {
        return (
          <EuiFlexItem key={`set-up-card-${index}`}>
            <EuiCard
              layout="horizontal"
              icon={
                item.icon ? (
                  <EuiIcon size="xxl" {...item.icon} data-test-subj={`${item.id}Icon`} />
                ) : undefined
              }
              title={
                <EuiTitle
                  size="s"
                  css={css`
                    font-size: 19px;
                  `}
                >
                  <span>{item.title}</span>
                </EuiTitle>
              }
              description={
                <>
                  <span
                    css={css`
                      color: ${euiTheme.colors.mediumShade};
                    `}
                  >
                    {item.description && item.description}
                  </span>
                  {item.footer && item.footer}
                </>
              }
              hasBorder
              paddingSize="l"
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

export const WelcomePanel = React.memo(WelcomePanelComponent);
