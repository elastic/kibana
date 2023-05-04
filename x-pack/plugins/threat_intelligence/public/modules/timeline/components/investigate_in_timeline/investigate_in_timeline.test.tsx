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
import { InvestigateInTimelineContextMenu, InvestigateInTimelineButtonIcon } from '.';
import { EMPTY_VALUE } from '../../../../common/constants';

describe('<InvestigateInTimeline />', () => {
  describe('<InvestigateInTimelineButton />', () => {
    it('should render button when Indicator data is correct', () => {
      const mockData: Indicator = generateMockUrlIndicator();
      const mockId = 'mockId';

      const component = render(
        <TestProvidersComponent>
          <InvestigateInTimelineContextMenu data={mockData} data-test-subj={mockId} />
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
          <InvestigateInTimelineContextMenu data={mockData} />
        </TestProvidersComponent>
      );

      expect(component).toMatchSnapshot();
    });
  });

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
});
