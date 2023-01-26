/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IndicatorFieldValue } from '.';
import {
  generateMockIndicator,
  generateMockIndicatorWithTlp,
} from '../../../../../common/types/indicator';
import { EMPTY_VALUE } from '../../../../common/constants';
import { TestProvidersComponent } from '../../../../common/mocks/test_providers';

const mockIndicator = generateMockIndicator();

describe('<IndicatorField />', () => {
  beforeEach(() => {});

  it('should return non formatted value', () => {
    const mockField = 'threat.indicator.ip';
    const { asFragment } = render(
      <IndicatorFieldValue indicator={mockIndicator} field={mockField} />
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it(`should return ${EMPTY_VALUE}`, () => {
    const mockField = 'abc';
    const { asFragment } = render(
      <IndicatorFieldValue indicator={mockIndicator} field={mockField} />
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('should return date-formatted value', () => {
    const mockField = 'threat.indicator.first_seen';
    const { asFragment } = render(
      <TestProvidersComponent>
        <IndicatorFieldValue indicator={mockIndicator} field={mockField} />
      </TestProvidersComponent>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render tlp marking badge', () => {
    const mockField = 'threat.indicator.marking.tlp';
    const { asFragment } = render(
      <TestProvidersComponent>
        <IndicatorFieldValue indicator={generateMockIndicatorWithTlp()} field={mockField} />
      </TestProvidersComponent>
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
