/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIGHT_THEME } from '@elastic/charts';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { render } from '@testing-library/react';
import { Props, Threshold } from './threshold';
import React from 'react';

describe('Threshold', () => {
  const renderComponent = (props: Partial<Props> = {}) => {
    const defaultProps: Props = {
      chartProps: { baseTheme: LIGHT_THEME },
      comparator: COMPARATORS.GREATER_THAN,
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
    expect(component.queryByTestId('threshold-90-93')).toBeTruthy();
  });
});
