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
} from '../../../../common/types/indicator';
import { TestProvidersComponent } from '../../../mocks/test_providers';
import {
  InvestigateInTimelineContextMenu,
  InvestigateInTimelineButtonIcon,
} from './investigate_in_timeline';
import { EMPTY_VALUE } from '../../../constants/common';

const TEST_ID = 'test';

describe('<InvestigateInTimelineContextMenu /> <InvestigateInTimelineButtonIcon />', () => {
  it('should render EuiContextMenuItem when Indicator data is correct', () => {
    const mockData: Indicator = generateMockUrlIndicator();

    const { getByTestId, getAllByText } = render(
      <TestProvidersComponent>
        <InvestigateInTimelineContextMenu data={mockData} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );

    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TEST_ID)).toHaveClass('euiContextMenuItem');
    expect(getAllByText('Investigate in Timeline')).toHaveLength(1);
  });

  it('should render empty component when Indicator data is incorrect', () => {
    const mockData: Indicator = generateMockIndicator();
    mockData.fields['threat.indicator.first_seen'] = [''];

    const { container } = render(
      <TestProvidersComponent>
        <InvestigateInTimelineContextMenu data={mockData} />
      </TestProvidersComponent>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render EuiButtonIcon when Indicator data is correct', () => {
    const mockData: Indicator = generateMockUrlIndicator();

    const { getByTestId } = render(
      <TestProvidersComponent>
        <InvestigateInTimelineButtonIcon data={mockData} data-test-subj={TEST_ID} />
      </TestProvidersComponent>
    );

    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TEST_ID)).toHaveClass('euiButtonIcon');
  });

  it(`should render empty component when calculated value is ${EMPTY_VALUE}`, () => {
    const mockData: Indicator = generateMockIndicator();
    mockData.fields['threat.indicator.first_seen'] = [''];

    const { container } = render(
      <TestProvidersComponent>
        <InvestigateInTimelineButtonIcon data={mockData} />
      </TestProvidersComponent>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
