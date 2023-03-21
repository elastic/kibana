/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentMeta } from '@storybook/react';
import React from 'react';
import { LIGHT_THEME } from '@elastic/charts';
import { EuiPanel } from '@elastic/eui';
import { EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { Comparator } from '../../../../common/alerting/metrics';
import { Props, Threshold as Component } from './threshold';

export default {
  component: Component,
  title: 'infra/alerting/Threshold',
  decorators: [
    (Story) => (
      <EuiPanel
        paddingSize="none"
        style={{
          height: '160px',
          overflow: 'hidden',
          position: 'relative',
          minWidth: '200px',
        }}
        hasShadow={false}
        element="div"
      >
        {Story()}
      </EuiPanel>
    ),
  ],
} as ComponentMeta<typeof Component>;

const defaultProps: Props = {
  chartProps: { theme: EUI_CHARTS_THEME_LIGHT.theme, baseTheme: LIGHT_THEME },
  title: 'Threshold breached',
  threshold: 90,
  value: 93,
  valueFormatter: (d) => `${d} %`,
  comparator: Comparator.GT,
};

export const Default = {
  args: {
    ...defaultProps,
  },
};
