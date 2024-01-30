/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEventHandler } from 'react';
import { EuiPanel, EuiStat, useEuiTheme, EuiIcon } from '@elastic/eui';
import type { EuiStatProps } from '@elastic/eui';
import { css } from '@emotion/react';

export interface VulnCounterCardProps {
  id: string;
  title: EuiStatProps['title'];
  titleColor?: EuiStatProps['titleColor'];
  description: EuiStatProps['description'];
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export const VulnCounterCard = ({
  id,
  title,
  titleColor,
  description,
  onClick,
}: VulnCounterCardProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      onClick={onClick}
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
      data-test-subj={id}
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
        title={title}
        titleColor={titleColor}
        descriptionElement="h6"
        description={description}
      />
      {onClick && (
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
};
