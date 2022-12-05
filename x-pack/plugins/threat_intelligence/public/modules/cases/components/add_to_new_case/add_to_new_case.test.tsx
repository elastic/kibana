/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { generateMockFileIndicator, Indicator } from '../../../../../common/types/indicator';
import { TestProvidersComponent } from '../../../../common/mocks/test_providers';
import { AddToNewCase } from './add_to_new_case';

describe('AddToNewCase', () => {
  it('should render an EuiContextMenuItem', () => {
    const indicator: Indicator = generateMockFileIndicator();
    const onClick = () => window.alert('clicked');
    const component = render(
      <TestProvidersComponent>
        <AddToNewCase indicator={indicator} onClick={onClick} />
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });
  it('should render the EuiContextMenuItem disabled', () => {
    const indicator: Indicator = generateMockFileIndicator();
    const fields = { ...indicator.fields };
    delete fields['threat.indicator.name'];
    const indicatorMissingName = {
      _id: indicator._id,
      fields,
    };
    const onClick = () => window.alert('clicked');
    const component = render(
      <TestProvidersComponent>
        <AddToNewCase indicator={indicatorMissingName} onClick={onClick} />
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });
});
