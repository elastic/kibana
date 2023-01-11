/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricEmbeddableProps } from './metric_embeddable';
import { MetricEmbeddable } from './metric_embeddable';
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

jest.mock('../../../common/components/visualization_actions/lens_embeddable', () => {
  return {
    LensEmbeddable: () => <div data-test-subj="embeddable-metric" />,
  };
});

describe('MetricEmbeddable', () => {
  const testProps = {
    fields: [
      {
        key: 'uniqueSourceIps',
        description: 'Source',
        color: '#D36086',
        icon: 'cross',
        lensAttributes: {} as LensAttributes,
      },
      {
        key: 'uniqueDestinationIps',
        description: 'Dest.',
        color: '#9170B8',
        icon: 'cross',
        lensAttributes: {} as LensAttributes,
      },
    ],
    id: 'test',
    timerange: { from: '', to: '' },
  } as MetricEmbeddableProps;

  let res: RenderResult;

  beforeEach(() => {
    res = render(
      <TestProviders>
        <MetricEmbeddable {...testProps} />
      </TestProviders>
    );
  });

  it('renders icons', () => {
    expect(res.getAllByTestId('stat-icon')).toHaveLength(2);
  });

  it('render embeddables', () => {
    expect(res.getAllByTestId('embeddable-metric')).toHaveLength(2);
  });

  it('render titles', () => {
    expect(res.getAllByText('Source')).toHaveLength(1);
    expect(res.getAllByText('Dest.')).toHaveLength(1);
  });
});
