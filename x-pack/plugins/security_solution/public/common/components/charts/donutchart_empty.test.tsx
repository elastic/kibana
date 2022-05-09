/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { DonutChartEmpty } from './donutchart_empty';

describe('DonutChartEmpty', () => {
  test('render', () => {
    const { container } = render(<DonutChartEmpty />);
    expect(container.querySelector(`[data-test-subj="empty-donut"]`)).toBeInTheDocument();
    expect(container.querySelector(`[data-test-subj="empty-donut-small"]`)).toBeInTheDocument();
  });

  test('does Not render', () => {
    const props = {
      size: 90,
      donutWidth: 90,
    };
    const { container } = render(<DonutChartEmpty {...props} />);
    expect(container.querySelector(`[data-test-subj="empty-donut"]`)).not.toBeInTheDocument();
    expect(container.querySelector(`[data-test-subj="empty-donut-small"]`)).not.toBeInTheDocument();
  });
});
