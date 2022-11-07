/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AddToExistingCase } from './add_to_existing_case';
import { TestProvidersComponent } from '../../../../common/mocks/test_providers';
import { generateMockFileIndicator, Indicator } from '../../../../../common/types/indicator';

describe('AddToExistingCase', () => {
  it('should render an EuiContextMenuItem', () => {
    const indicator: Indicator = generateMockFileIndicator();
    const onClick = () => window.alert('clicked');
    const component = render(
      <TestProvidersComponent>
        <AddToExistingCase indicator={indicator} onClick={onClick} />
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });
});
