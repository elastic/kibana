/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEventHandler, ReactNode } from 'react';
import { EuiPanel, EuiStat, useEuiTheme, EuiHorizontalRule, EuiIcon } from '@elastic/eui';
import type { EuiStatProps } from '@elastic/eui';
import { css } from '@emotion/react';

interface CommonCounterCardProps {
  id: string;
  title: EuiStatProps['title'];
  titleColor?: EuiStatProps['titleColor'];
  description: EuiStatProps['description'];
}

interface CounterCardButton extends CommonCounterCardProps {
  button?: ReactNode;
}

interface CounterCardOnClick extends CommonCounterCardProps {
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export type CspCounterCardProps = CounterCardButton | CounterCardOnClick;

export const CspCounterCard = (counter: CspCounterCardProps) => {
  const { euiTheme } = useEuiTheme();

  if ('button' in counter) {
    return (
      <EuiPanel hasBorder paddingSize="m" data-test-subj={counter.id}>
        <EuiStat
          css={{
            height: '60%',
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
        <EuiHorizontalRule margin="xs" />
        {counter.button}
      </EuiPanel>
    );
  }

  if ('onClick' in counter) {
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
            type={'pivot'}
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
  }

  return null;
};
