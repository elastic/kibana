/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IndicatorsFiltersContext } from '../../../../containers/filters';
import { StoryProvidersComponent } from '../../../../../../common/mocks/story_providers';
import { generateMockIndicator } from '../../../../../../../common/types/indicator';
import { IndicatorBlock } from '.';
import { IndicatorsFlyoutContext } from '../../context';

export default {
  component: IndicatorBlock,
  title: 'IndicatorBlock',
};

const mockIndicator = generateMockIndicator();

export function Default() {
  const mockField = 'threat.indicator.ip';
  const context = {
    kqlBarIntegration: false,
  };

  return (
    <StoryProvidersComponent>
      <IndicatorsFiltersContext.Provider value={{} as any}>
        <IndicatorsFlyoutContext.Provider value={context}>
          <IndicatorBlock indicator={mockIndicator} field={mockField} />
        </IndicatorsFlyoutContext.Provider>
      </IndicatorsFiltersContext.Provider>
    </StoryProvidersComponent>
  );
}

export function NoFilterButtons() {
  const mockField = 'threat.indicator.ip';
  const context = {
    kqlBarIntegration: true,
  };

  return (
    <StoryProvidersComponent>
      <IndicatorsFiltersContext.Provider value={{} as any}>
        <IndicatorsFlyoutContext.Provider value={context}>
          <IndicatorBlock indicator={mockIndicator} field={mockField} />
        </IndicatorsFlyoutContext.Provider>
      </IndicatorsFiltersContext.Provider>
    </StoryProvidersComponent>
  );
}
