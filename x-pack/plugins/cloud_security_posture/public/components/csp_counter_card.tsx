/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard, EuiIcon, EuiStat, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { EuiStatProps } from '@elastic/eui/src/components/stat/stat';
import { EuiCardProps } from '@elastic/eui/src/components/card/card';

export type CspCounterCardProps = Pick<EuiStatProps, 'title' | 'description' | 'titleColor'> &
  Pick<EuiCardProps, 'onClick'>;

export const CspCounterCard = ({ counter }: { counter: CspCounterCardProps }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiCard
      title={''}
      hasBorder
      onClick={counter.onClick}
      paddingSize="m"
      css={`
        position: relative;

        .euiCard__title {
          display: none;
        }

        :hover .euiIcon {
          color: ${euiTheme.colors.primary};
          transition: ${euiTheme.animation.normal};
        }
      `}
    >
      <EuiStat
        descriptionElement="h5"
        titleSize="s"
        description={counter.description}
        title={counter.title || 0}
        titleColor={counter.titleColor}
        css={`
          display: flex;
          flex-direction: column;
          gap: 8px;
        `}
      />
      {counter.onClick && (
        <EuiIcon
          type="popout"
          css={`
            position: absolute;
            top: 5px;
            right: 5px;
          `}
        />
      )}
    </EuiCard>
  );
};
