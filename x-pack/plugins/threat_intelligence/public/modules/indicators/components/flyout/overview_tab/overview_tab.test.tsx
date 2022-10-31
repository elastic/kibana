/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProvidersComponent } from '../../../../../common/mocks/test_providers';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { generateMockIndicator, Indicator } from '../../../../../../common/types/indicator';
import {
  IndicatorsFlyoutOverview,
  TI_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS,
  TI_FLYOUT_OVERVIEW_TABLE,
} from '.';
import { EMPTY_PROMPT_TEST_ID } from '../empty_prompt';

describe('<IndicatorsFlyoutOverview />', () => {
  describe('invalid indicator', () => {
    it('should render error message on invalid indicator', () => {
      render(
        <TestProvidersComponent>
          <IndicatorsFlyoutOverview
            onViewAllFieldsInTable={() => {}}
            indicator={{ fields: {} } as unknown as Indicator}
          />
        </TestProvidersComponent>
      );

      expect(screen.getByTestId(EMPTY_PROMPT_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render the highlighted blocks and table when valid indicator is passed', () => {
    render(
      <TestProvidersComponent>
        <IndicatorsFlyoutOverview
          onViewAllFieldsInTable={() => {}}
          indicator={generateMockIndicator()}
        />
      </TestProvidersComponent>
    );

    expect(screen.queryByTestId(TI_FLYOUT_OVERVIEW_TABLE)).toBeInTheDocument();
    expect(screen.queryByTestId(TI_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS)).toBeInTheDocument();
  });
});
