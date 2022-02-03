/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ObservabilityStatusBoxes } from './observability_status_boxes';

describe('ObservabilityStatusBoxes', () => {
  it('should render all boxes passed as prop', () => {
    const boxes = [
      {
        id: 'logs',
        dataSourceName: 'Logs',
        hasData: true,
        description: 'This is the description for logs',
        modules: [],
        integrationLink: 'http://example.com',
        learnMoreLink: 'http://example.com',
      },
      {
        id: 'metrics',
        dataSourceName: 'Metrics',
        hasData: true,
        description: 'This is the description for metrics',
        modules: [],
        integrationLink: 'http://example.com',
        learnMoreLink: 'http://example.com',
      },
    ];

    render(<ObservabilityStatusBoxes boxes={boxes} />);

    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
  });
});
