/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEventHandler } from 'react';
import { css } from '@emotion/react';
import { EuiIcon, EuiPanel, EuiStat, useEuiTheme } from '@elastic/eui';
import type { EuiStatProps } from '@elastic/eui';

export interface CspCounterCardProps {
  id: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  title: EuiStatProps['title'];
  titleColor?: EuiStatProps['titleColor'];
  description: EuiStatProps['description'];
}

// Todo: remove when EuiIcon type="pivot" is available
const PivotIcon = ({ ...props }) => (
  <svg width="16" height="16" fill="none" viewBox="0 0 16 16" {...props}>
    <path
      fillRule="evenodd"
      d="M2.89 13.847 11.239 5.5a.522.522 0 0 0-.737-.737L2.154 13.11a.522.522 0 0 0 .738.738ZM14 6.696a.522.522 0 1 1-1.043 0v-3.13a.522.522 0 0 0-.522-.523h-3.13a.522.522 0 1 1 0-1.043h3.13C13.299 2 14 2.7 14 3.565v3.13Z"
      clipRule="evenodd"
    />
  </svg>
);

export const CspCounterCard = (counter: CspCounterCardProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      onClick={counter.onClick}
      paddingSize="m"
      css={css`
        position: relative;
        display: flex;
        align-items: center;

        :hover .euiIcon {
          color: ${euiTheme.colors.primary};
          transition: ${euiTheme.animation.normal};
        }
      `}
      data-test-subj={counter.id}
    >
      <EuiStat
        css={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          '.euiText h6': {
            textTransform: 'capitalize',
            fontSize: euiTheme.size.m,
          },
        }}
        titleSize="s"
        title={counter.title}
        titleColor={counter.titleColor}
        descriptionElement="h6"
        description={counter.description}
      />
      {counter.onClick && (
        <EuiIcon
          // Todo: update when EuiIcon type="pivot" is available
          type={PivotIcon}
          css={css`
            color: ${euiTheme.colors.lightShade};
            position: absolute;
            top: ${euiTheme.size.s};
            right: ${euiTheme.size.s};
          `}
        />
      )}
    </EuiPanel>
  );
};
