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
import { EMPTY_VALUE } from '../../../../../common/constants';
import { TestProvidersComponent } from '../../../../common/mocks/test_providers';
import { InvestigateInTimelineButtonIcon } from './investigate_in_timeline_button_icon';

describe('<InvestigateInTimelineButtonIcon />', () => {
  it('should render button icon when Indicator data is correct', () => {
    const mockData: Indicator = generateMockUrlIndicator();
    const mockId = 'mockId';

    const component = render(
      <TestProvidersComponent>
        <InvestigateInTimelineButtonIcon data={mockData} data-test-subj={mockId} />
      </TestProvidersComponent>
    );

    expect(component.getByTestId(mockId)).toBeInTheDocument();
    expect(component).toMatchSnapshot();
  });

  it(`should render empty component when calculated value is ${EMPTY_VALUE}`, () => {
    const mockData: Indicator = generateMockIndicator();
    mockData.fields['threat.indicator.first_seen'] = [''];

    const component = render(
      <TestProvidersComponent>
        <InvestigateInTimelineButtonIcon data={mockData} />
      </TestProvidersComponent>
    );

    expect(component).toMatchSnapshot();
  });
});
