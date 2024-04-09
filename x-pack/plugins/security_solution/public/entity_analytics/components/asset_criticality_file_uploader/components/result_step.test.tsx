/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AssetCriticalityResultStep } from './result_step';
import { TestProviders } from '../../../../common/mock';

describe('AssetCriticalityResultStep', () => {
  const mockValidLinesAsText = 'valid lines as text';

  it('renders successful result', () => {
    const { getByTestId } = render(
      <AssetCriticalityResultStep
        result={{
          errors: [],
          stats: {
            total: 10,
            updated: 5,
            created: 5,
            errors: 0,
          },
        }}
        validLinesAsText={mockValidLinesAsText}
        onReturn={jest.fn()}
      />,
      { wrapper: TestProviders }
    );

    expect(getByTestId('asset-criticality-result-step-success')).toBeInTheDocument();
  });

  it('renders unsuccessful result', () => {
    const { getByTestId } = render(
      <AssetCriticalityResultStep
        validLinesAsText={mockValidLinesAsText}
        errorMessage={'test error message'}
        onReturn={jest.fn()}
      />,
      { wrapper: TestProviders }
    );

    expect(getByTestId('asset-criticality-result-step-error')).toBeInTheDocument();
  });

  it('renders partial successful result', () => {
    const { getByTestId } = render(
      <AssetCriticalityResultStep
        validLinesAsText={mockValidLinesAsText}
        onReturn={jest.fn()}
        result={{
          errors: [
            { message: 'error message 1', index: 1 },
            { message: 'error message 2', index: 3 },
            { message: 'error message 3', index: 5 },
          ],
          stats: {
            total: 5,
            updated: 0,
            created: 2,
            errors: 3,
          },
        }}
      />,
      { wrapper: TestProviders }
    );

    expect(getByTestId('asset-criticality-result-step-warning')).toBeInTheDocument();
  });
});
