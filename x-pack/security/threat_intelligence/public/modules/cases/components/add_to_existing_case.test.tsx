/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AddToExistingCase } from './add_to_existing_case';
import { TestProvidersComponent } from '../../../mocks/test_providers';
import { generateMockFileIndicator, Indicator } from '../../../../common/types/indicator';
import { casesPluginMock } from '@kbn/cases-plugin/public/mocks';
import { KibanaContext } from '../../../hooks/use_kibana';

const TEST_ID = 'test';
const indicator: Indicator = generateMockFileIndicator();
const onClick = () => window.alert('clicked');
const casesServiceMock = casesPluginMock.createStartContract();

describe('AddToExistingCase', () => {
  it('should render an EuiContextMenuItem', () => {
    const mockedServices = {
      cases: {
        ...casesServiceMock,
        helpers: {
          ...casesServiceMock.helpers,
          canUseCases: () => ({
            create: true,
            update: true,
          }),
        },
      },
    };

    const { getByTestId, getAllByText } = render(
      <TestProvidersComponent>
        <KibanaContext.Provider value={{ services: mockedServices } as any}>
          <AddToExistingCase indicator={indicator} onClick={onClick} data-test-subj={TEST_ID} />
        </KibanaContext.Provider>
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(getAllByText('Add to existing case')).toHaveLength(1);
  });

  it('should render the EuiContextMenuItem disabled if indicator is missing name', () => {
    const mockedServices = {
      cases: {
        ...casesServiceMock,
        helpers: {
          ...casesServiceMock.helpers,
          canUseCases: () => ({
            create: true,
            update: true,
          }),
        },
      },
    };

    const fields = { ...indicator.fields };
    delete fields['threat.indicator.name'];
    const indicatorMissingName = {
      _id: indicator._id,
      fields,
    };
    const { getByTestId } = render(
      <TestProvidersComponent>
        <KibanaContext.Provider value={{ services: mockedServices } as any}>
          <AddToExistingCase
            indicator={indicatorMissingName}
            onClick={onClick}
            data-test-subj={TEST_ID}
          />
        </KibanaContext.Provider>
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveAttribute('disabled');
  });

  it('should render the EuiContextMenuItem disabled if user has no update permission', () => {
    const mockedServices = {
      cases: {
        ...casesServiceMock,
        helpers: {
          ...casesServiceMock.helpers,
          canUseCases: () => ({
            create: false,
            update: false,
          }),
        },
      },
    };

    const { getByTestId } = render(
      <TestProvidersComponent>
        <KibanaContext.Provider value={{ services: mockedServices } as any}>
          <AddToExistingCase indicator={indicator} onClick={onClick} data-test-subj={TEST_ID} />
        </KibanaContext.Provider>
      </TestProvidersComponent>
    );
    expect(getByTestId(TEST_ID)).toHaveAttribute('disabled');
  });
});
