/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ObservabilityStatusBoxes } from './observability_status_boxes';
import { I18nProvider } from '@kbn/i18n-react';

describe('ObservabilityStatusBoxes', () => {
  it('should render all boxes passed as prop', () => {
    const boxes = [
      {
        id: 'logs',
        title: 'Logs',
        hasData: true,
        description: 'This is the description for logs',
        modules: [],
        addTitle: 'logs add title',
        addLink: 'http://example.com',
        learnMoreLink: 'http://example.com',
        goToAppTitle: 'go to app title',
        goToAppLink: 'go to app link',
      },
      {
        id: 'metrics',
        title: 'Metrics',
        hasData: true,
        description: 'This is the description for metrics',
        modules: [],
        addTitle: 'metrics add title',
        addLink: 'http://example.com',
        learnMoreLink: 'http://example.com',
        goToAppTitle: 'go to app title',
        goToAppLink: 'go to app link',
      },
    ];

    render(
      <I18nProvider>
        <ObservabilityStatusBoxes boxes={boxes} />
      </I18nProvider>
    );

    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
  });
});
