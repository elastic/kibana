/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IndicatorFieldValue } from '.';
import { generateMockIndicator } from '../../../../../common/types/indicator';
import { EMPTY_VALUE } from '../../../../../common/constants';
import { TestProvidersComponent } from '../../../../common/mocks/test_providers';

const mockIndicator = generateMockIndicator();

describe('<IndicatorField />', () => {
  beforeEach(() => {});

  it('should return non formatted value', () => {
    const mockField = 'threat.indicator.ip';
    const component = render(<IndicatorFieldValue indicator={mockIndicator} field={mockField} />);
    expect(component).toMatchSnapshot();
  });

  it(`should return ${EMPTY_VALUE}`, () => {
    const mockField = 'abc';
    const component = render(<IndicatorFieldValue indicator={mockIndicator} field={mockField} />);
    expect(component).toMatchSnapshot();
  });

  it('should return date-formatted value', () => {
    const mockField = 'threat.indicator.first_seen';
    const component = render(
      <TestProvidersComponent>
        <IndicatorFieldValue indicator={mockIndicator} field={mockField} />
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });
});
