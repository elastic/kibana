/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIGHT_THEME } from '@elastic/charts';
import { EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';

import { render } from '@testing-library/react';
import { Props, Threshold } from './custom_threshold';
import React from 'react';
import { Comparator } from '../../../../common/custom_threshold_rule/types';

describe('Threshold', () => {
  const renderComponent = (props: Partial<Props> = {}) => {
    const defaultProps: Props = {
      chartProps: { theme: EUI_CHARTS_THEME_LIGHT.theme, baseTheme: LIGHT_THEME },
      comparator: Comparator.GT,
      id: 'componentId',
      threshold: 90,
      title: 'Threshold breached',
      value: 93,
      valueFormatter: (d) => `${d}%`,
    };

    return render(
      <div
        style={{
          height: '160px',
          width: '240px',
        }}
      >
        <Threshold {...defaultProps} {...props} />
      </div>
    );
  };

  it('shows component', () => {
    const component = renderComponent();
    expect(component.queryByTestId('thresholdRule-90-93')).toBeTruthy();
  });
});
