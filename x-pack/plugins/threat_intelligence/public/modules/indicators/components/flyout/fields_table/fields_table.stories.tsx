/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mockIndicatorsFiltersContext } from '../../../../../common/mocks/mock_indicators_filters_context';
import { IndicatorFieldsTable } from '.';
import { generateMockIndicator } from '../../../../../../common/types/indicator';
import { StoryProvidersComponent } from '../../../../../common/mocks/story_providers';
import { IndicatorsFiltersContext } from '../../../containers/filters';
import { IndicatorsFlyoutContext } from '../context';

export default {
  component: IndicatorFieldsTable,
  title: 'IndicatorFieldsTable',
};

export function WithIndicators() {
  const indicator = generateMockIndicator();
  const context = {
    kqlBarIntegration: false,
  };

  return (
    <StoryProvidersComponent>
      <IndicatorsFiltersContext.Provider value={mockIndicatorsFiltersContext}>
        <IndicatorsFlyoutContext.Provider value={context}>
          <IndicatorFieldsTable
            fields={['threat.indicator.type']}
            indicator={indicator}
            search={false}
          />
        </IndicatorsFlyoutContext.Provider>
      </IndicatorsFiltersContext.Provider>
    </StoryProvidersComponent>
  );
}

export function NoFilterButtons() {
  const indicator = generateMockIndicator();
  const context = {
    kqlBarIntegration: true,
  };

  return (
    <StoryProvidersComponent>
      <IndicatorsFiltersContext.Provider value={mockIndicatorsFiltersContext}>
        <IndicatorsFlyoutContext.Provider value={context}>
          <IndicatorFieldsTable
            fields={['threat.indicator.type']}
            indicator={indicator}
            search={false}
          />
        </IndicatorsFlyoutContext.Provider>
      </IndicatorsFiltersContext.Provider>
    </StoryProvidersComponent>
  );
}
