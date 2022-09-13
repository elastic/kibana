/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { mockIndicatorsFiltersContext } from '../../../../common/mocks/mock_indicators_filters_context';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { IndicatorsFiltersContext } from '../../../indicators/context';
import { FilterOut } from '.';

export default {
  component: FilterOut,
  title: 'FilterOut',
};

export const Default: Story<void> = () => {
  const mockIndicator: Indicator = generateMockIndicator();
  const mockField: string = 'threat.feed.name';

  return (
    <IndicatorsFiltersContext.Provider value={mockIndicatorsFiltersContext}>
      <FilterOut data={mockIndicator} field={mockField} />
    </IndicatorsFiltersContext.Provider>
  );
};
