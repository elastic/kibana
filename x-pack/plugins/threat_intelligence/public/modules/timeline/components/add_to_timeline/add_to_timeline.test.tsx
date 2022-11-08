/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { EMPTY_VALUE } from '../../../../common/constants';
import { AddToTimelineButtonIcon } from '.';
import { TestProvidersComponent } from '../../../../common/mocks/test_providers';

describe('<AddToTimeline />', () => {
  it('should render timeline button when Indicator data', () => {
    const mockField: string = 'threat.indicator.ip';
    const mockData: Indicator = generateMockIndicator();

    const component = render(
      <TestProvidersComponent>
        <AddToTimelineButtonIcon field={mockField} data={mockData} />
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it('should render timeline button when string data', () => {
    const mockField: string = 'threat.indicator.ip';
    const mockString: string = 'ip';

    const component = render(
      <TestProvidersComponent>
        <AddToTimelineButtonIcon field={mockField} data={mockString} />
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it(`should render empty component when field doesn't exist in data`, () => {
    const mockField: string = 'abc';
    const mockData: Indicator = generateMockIndicator();

    const component = render(
      <TestProvidersComponent>
        <AddToTimelineButtonIcon field={mockField} data={mockData} />
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it(`should render empty component when field exist in data but isn't supported`, () => {
    const mockField: string = 'abc';
    const mockData: Indicator = generateMockIndicator();
    mockData.fields['threat.indicator.type'] = ['abc'];

    const component = render(
      <TestProvidersComponent>
        <AddToTimelineButtonIcon field={mockField} data={mockData} />
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it(`should render empty component when calculated value is ${EMPTY_VALUE}`, () => {
    const mockField: string = 'threat.indicator.first_seen';
    const mockData: Indicator = generateMockIndicator();
    mockData.fields['threat.indicator.first_seen'] = [''];

    const component = render(
      <TestProvidersComponent>
        <AddToTimelineButtonIcon field={mockField} data={mockData} />
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it(`should render empty component when data is ${EMPTY_VALUE}`, () => {
    const mockField: string = 'threat.indicator.ip';
    const mockData = EMPTY_VALUE;

    const component = render(
      <TestProvidersComponent>
        <AddToTimelineButtonIcon field={mockField} data={mockData} />
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });
});
