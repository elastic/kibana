/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IndicatorField } from './indicator_field';
import { generateMockIndicator } from '../../../../../common/types/indicator';
import { EMPTY_VALUE } from '../../../../../common/constants';
import { TestProvidersComponent } from '../../../../common/mocks/test_providers';

const mockIndicator = generateMockIndicator();
const mockFieldTypesMap: { [id: string]: string } = {
  'threat.indicator.ip': 'ip',
  'threat.indicator.first_seen': 'date',
};

describe('<IndicatorField />', () => {
  beforeEach(() => {});

  it('should return non formatted value', () => {
    const mockField = 'threat.indicator.ip';
    const component = render(
      <IndicatorField
        indicator={mockIndicator}
        field={mockField}
        fieldTypesMap={mockFieldTypesMap}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it(`should return ${EMPTY_VALUE}`, () => {
    const mockField = 'abc';
    const component = render(
      <IndicatorField
        indicator={mockIndicator}
        field={mockField}
        fieldTypesMap={mockFieldTypesMap}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('should return date-formatted value', () => {
    const mockField = 'threat.indicator.first_seen';
    const component = render(
      <TestProvidersComponent>
        <IndicatorField
          indicator={mockIndicator}
          field={mockField}
          fieldTypesMap={mockFieldTypesMap}
        />
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });
});
