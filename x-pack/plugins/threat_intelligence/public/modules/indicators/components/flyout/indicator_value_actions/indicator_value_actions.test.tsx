/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { generateMockFileIndicator, Indicator } from '../../../../../../common/types/indicator';
import { render } from '@testing-library/react';
import { IndicatorValueActions } from './indicator_value_actions';
import { IndicatorsFlyoutContext } from '../context';
import { TestProvidersComponent } from '../../../../../common/mocks/test_providers';

describe('IndicatorValueActions', () => {
  const indicator: Indicator = generateMockFileIndicator();

  it('should return null if field and value are invalid', () => {
    const field: string = 'invalid';
    const context = {
      kqlBarIntegration: true,
    };
    const component = render(
      <IndicatorsFlyoutContext.Provider value={context}>
        <IndicatorValueActions indicator={indicator} field={field} />
      </IndicatorsFlyoutContext.Provider>
    );
    expect(component).toMatchSnapshot();
  });

  it('should only render add to timeline and copy to clipboard', () => {
    const field: string = 'threat.indicator.name';
    const context = {
      kqlBarIntegration: true,
    };
    const component = render(
      <TestProvidersComponent>
        <IndicatorsFlyoutContext.Provider value={context}>
          <IndicatorValueActions indicator={indicator} field={field} />
        </IndicatorsFlyoutContext.Provider>
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it('should render filter in/out and dropdown for add to timeline and copy to clipboard', () => {
    const field: string = 'threat.indicator.name';
    const context = {
      kqlBarIntegration: false,
    };
    const component = render(
      <TestProvidersComponent>
        <IndicatorsFlyoutContext.Provider value={context}>
          <IndicatorValueActions indicator={indicator} field={field} />
        </IndicatorsFlyoutContext.Provider>
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });
});
