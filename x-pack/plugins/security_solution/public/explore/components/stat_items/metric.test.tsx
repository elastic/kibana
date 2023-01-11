/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricProps } from './metric';
import { Metric } from './metric';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import type { LensAttributes } from '../../../common/components/visualization_actions/types';

jest.mock('../../../common/components/visualization_actions', () => {
  return {
    VisualizationActions: () => <div data-test-subj="visualizationActions" />,
  };
});

describe('Metric', () => {
  const testProps = {
    fields: [
      {
        key: 'uniqueSourceIps',
        description: 'Source',
        value: 1714,
        color: '#D36086',
        icon: 'cross',
        lensAttributes: {} as LensAttributes,
      },
      {
        key: 'uniqueDestinationIps',
        description: 'Dest.',
        value: 2359,
        color: '#9170B8',
        icon: 'cross',
        lensAttributes: {} as LensAttributes,
      },
    ],
    id: 'test',
    timerange: { from: '', to: '' },
    isAreaChartDataAvailable: true,
    isBarChartDataAvailable: true,
  } as MetricProps;

  let res: RenderResult;

  beforeEach(() => {
    res = render(
      <TestProviders>
        <Metric {...testProps} />
      </TestProviders>
    );
  });

  it('renders icons', () => {
    expect(res.getAllByTestId('stat-icon')).toHaveLength(2);
  });

  it('render titles', () => {
    expect(res.getAllByTestId('stat-title')[0]).toHaveTextContent('1,714 Source');
    expect(res.getAllByTestId('stat-title')[1]).toHaveTextContent('2,359 Dest.');
  });

  it('render actions', () => {
    expect(res.getAllByTestId('visualizationActions')).toHaveLength(2);
  });
});
