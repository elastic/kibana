/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';

import { I18nProvider } from '@kbn/i18n-react';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { timefilterServiceMock } from '@kbn/data-plugin/public/query/timefilter/timefilter_service.mock';

import { SearchItems } from '../../../../hooks/use_search_items';

import { StepDefineForm } from './step_define_form';

import { MlSharedContext } from '../../../../__mocks__/shared_context';
import { getMlSharedImports } from '../../../../../shared_imports';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../app_dependencies');

const startMock = coreMock.createStart();

const getMockedDatePickerDependencies = () => {
  return {
    data: {
      query: {
        timefilter: timefilterServiceMock.createStartContract(),
      },
    },
    notifications: {},
  } as unknown as DatePickerDependencies;
};

const createMockWebStorage = () => ({
  clear: jest.fn(),
  getItem: jest.fn(),
  key: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
  length: 0,
});

const createMockStorage = () => ({
  storage: createMockWebStorage(),
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
});

// FLAKY: https://github.com/elastic/kibana/issues/150777
describe.skip('Transform: <DefinePivotForm />', () => {
  test('Minimal initialization', async () => {
    // Arrange
    const mlSharedImports = await getMlSharedImports();

    const searchItems = {
      dataView: {
        getIndexPattern: () => 'the-data-view-index-pattern',
        fields: [] as any[],
      } as SearchItems['dataView'],
    };

    // mock services for QueryStringInput
    const services = {
      ...startMock,
      data: dataPluginMock.createStartContract(),
      appName: 'the-test-app',
      storage: createMockStorage(),
    };

    const { getByText } = render(
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <MlSharedContext.Provider value={mlSharedImports}>
            <DatePickerContextProvider {...getMockedDatePickerDependencies()}>
              <StepDefineForm onChange={jest.fn()} searchItems={searchItems as SearchItems} />
            </DatePickerContextProvider>
          </MlSharedContext.Provider>
        </KibanaContextProvider>
      </I18nProvider>
    );

    // Act

    // Assert

    await waitFor(() => {
      expect(getByText('Data view')).toBeInTheDocument();
      expect(getByText(searchItems.dataView.getIndexPattern())).toBeInTheDocument();
    });
  });
});
