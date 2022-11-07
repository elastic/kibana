/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiCard, EuiIcon, EuiStat, useEuiTheme } from '@elastic/eui';
import type { EuiStatProps, EuiCardProps } from '@elastic/eui';

export type CspCounterCardProps = Pick<EuiCardProps, 'onClick' | 'id'> &
  Pick<EuiStatProps, 'title' | 'description' | 'titleColor' | 'isLoading'>;

export const CspCounterCard = ({ counter }: { counter: CspCounterCardProps }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiCard
      title=""
      hasBorder
      onClick={counter.onClick}
      paddingSize="m"
      css={css`
        position: relative;

        .euiCard__title {
          display: none;
        }

        :hover .euiIcon {
          color: ${euiTheme.colors.primary};
          transition: ${euiTheme.animation.normal};
        }
      `}
      data-test-subj={counter.id}
    >
      <EuiStat
        descriptionElement="h5"
        titleSize="s"
        isLoading={counter.isLoading}
        description={counter.description}
        title={counter.title || 0}
        titleColor={counter.titleColor}
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.m};
        `}
      />
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
