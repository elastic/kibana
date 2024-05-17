/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIGHT_THEME } from '@elastic/charts';
import { ComponentMeta } from '@storybook/react';
import React from 'react';

import { Comparator } from '../../../../common/custom_threshold_rule/types';
import { Threshold as Component, Props } from './custom_threshold';

export default {
  component: Component,
  title: 'app/Alerts/Threshold',
  decorators: [
    (Story) => (
      <div
        style={{
          height: '160px',
          width: '240px',
        }}
      >
        {Story()}
      </div>
    ),
  ],
} as ComponentMeta<typeof Component>;

const defaultProps: Props = {
  chartProps: { baseTheme: LIGHT_THEME },
  comparator: Comparator.GT,
  id: 'componentId',
  threshold: [90],
  title: 'Threshold breached',
  value: 93,
  valueFormatter: (d) => `${d}%`,
};

export const Default = {
  args: {
    ...defaultProps,
  },
};
