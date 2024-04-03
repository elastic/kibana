/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { EuiPanel, EuiStat, useEuiTheme, EuiHorizontalRule } from '@elastic/eui';
import type { EuiStatProps } from '@elastic/eui';

export interface CspCounterCardProps {
  id: string;
  button?: ReactNode;
  title: EuiStatProps['title'];
  titleColor?: EuiStatProps['titleColor'];
  description: EuiStatProps['description'];
}

export const CspCounterCard = ({
  id,
  button,
  title,
  titleColor,
  description,
}: CspCounterCardProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={id}>
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
        title={title}
        titleColor={titleColor}
        descriptionElement="h6"
        description={description}
      />
      <EuiHorizontalRule margin="xs" />
      {button}
    </EuiPanel>
  );
};
