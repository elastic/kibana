/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  generateMockIndicator,
  generateMockUrlIndicator,
  Indicator,
} from '../../../../../common/types/indicator';
import { TestProvidersComponent } from '../../../../common/mocks/test_providers';
import { InvestigateInTimelineButton } from './investigate_in_timeline_button';

describe('<InvestigateInTimelineButton />', () => {
  it('should render button when Indicator data is correct', () => {
    const mockData: Indicator = generateMockUrlIndicator();
    const mockId = 'mockId';

    const component = render(
      <TestProvidersComponent>
        <InvestigateInTimelineButton data={mockData} data-test-subj={mockId} />
      </TestProvidersComponent>
    );

    expect(component.getByTestId(mockId)).toBeInTheDocument();
    expect(component).toMatchSnapshot();
  });

  it('should render empty component when Indicator data is incorrect', () => {
    const mockData: Indicator = generateMockIndicator();
    mockData.fields['threat.indicator.first_seen'] = [''];

    const component = render(
      <TestProvidersComponent>
        <InvestigateInTimelineButton data={mockData} />
      </TestProvidersComponent>
    );

    expect(component).toMatchSnapshot();
  });
});
