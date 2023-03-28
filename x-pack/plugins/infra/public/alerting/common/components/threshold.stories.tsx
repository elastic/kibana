/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentMeta } from '@storybook/react';
import { LIGHT_THEME } from '@elastic/charts';
import { EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { Comparator } from '../../../../common/alerting/metrics';
import { Props, Threshold as Component } from './threshold';

export default {
  component: Component,
  title: 'infra/alerting/Threshold',
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
  chartProps: { theme: EUI_CHARTS_THEME_LIGHT.theme, baseTheme: LIGHT_THEME },
  comparator: Comparator.GT,
  id: 'componentId',
  threshold: 90,
  title: 'Threshold breached',
  value: 93,
  valueFormatter: (d) => `${d}%`,
};

export const Default = {
  args: {
    ...defaultProps,
  },
};
