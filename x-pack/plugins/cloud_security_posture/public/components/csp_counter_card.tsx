/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiCard, EuiIcon, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { EuiStatProps, EuiCardProps } from '@elastic/eui';

export type CspCounterCardProps = Pick<EuiCardProps, 'onClick' | 'id'> &
  Pick<EuiStatProps, 'title' | 'description' | 'titleColor' | 'isLoading'>;

export const CspCounterCard = (counter: CspCounterCardProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiCard
      title={
        <EuiTitle size="xxxs">
          <h6>{counter.title}</h6>
        </EuiTitle>
      }
      hasBorder
      onClick={counter.onClick}
      paddingSize="m"
      layout="horizontal"
      css={css`
        position: relative;

        :hover .euiIcon {
          color: ${euiTheme.colors.primary};
          transition: ${euiTheme.animation.normal};
        }
      `}
      data-test-subj={counter.id}
    >
      <EuiText color={counter.titleColor}>
        <EuiTitle size="xs">
          <h3>{counter.description}</h3>
        </EuiTitle>
      </EuiText>
      {counter.onClick && (
        <EuiIcon
          type="link"
          css={css`
            position: absolute;
            top: ${euiTheme.size.m};
            right: ${euiTheme.size.m};
          `}
        />
      )}
    </EuiCard>
  );
};
