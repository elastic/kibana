/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mockIndicatorsFiltersContext } from '../../../../mocks/mock_indicators_filters_context';
import { IndicatorFieldsTable } from '.';
import { generateMockIndicator } from '../../../../types/indicator';
import { StoryProvidersComponent } from '../../../../../storybook_interop/story_providers';
import { FiltersContext } from '../../../../contexts';

export default {
  component: IndicatorFieldsTable,
  title: 'IndicatorFieldsTable',
};

export function WithIndicators() {
  const indicator = generateMockIndicator();

  return (
    <StoryProvidersComponent>
      <FiltersContext.Provider value={mockIndicatorsFiltersContext}>
        <IndicatorFieldsTable
          fields={['threat.indicator.type']}
          indicator={indicator}
          search={false}
        />
      </FiltersContext.Provider>
    </StoryProvidersComponent>
  );
}
