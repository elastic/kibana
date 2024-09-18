/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { I18nProvider } from '@kbn/i18n-react';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { timefilterServiceMock } from '@kbn/data-plugin/public/query/timefilter/timefilter_service.mock';

import { PIVOT_SUPPORTED_AGGS } from '../../../../../../common/types/pivot_aggs';

import type { PivotAggsConfigDict, PivotGroupByConfigDict } from '../../../../common';
import { PIVOT_SUPPORTED_GROUP_BY_AGGS } from '../../../../common';
import type { SearchItems } from '../../../../hooks/use_search_items';

import { getAggNameConflictToastMessages } from './common';
import { StepDefineForm } from './step_define_form';

import { MlSharedContext } from '../../../../__mocks__/shared_context';
import { getMlSharedImports } from '../../../../../shared_imports';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';

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

describe('Transform: <DefinePivotForm />', () => {
  test('Minimal initialization', async () => {
    // Arrange
    const queryClient = new QueryClient();
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
      unifiedSearch: unifiedSearchPluginMock.createStartContract(),
      appName: 'the-test-app',
      storage: createMockStorage(),
    };

    const mockOnChange = jest.fn();

    const { getByText } = render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <KibanaContextProvider services={services}>
            <MlSharedContext.Provider value={mlSharedImports}>
              <DatePickerContextProvider {...getMockedDatePickerDependencies()}>
                <StepDefineForm onChange={mockOnChange} searchItems={searchItems as SearchItems} />
              </DatePickerContextProvider>
            </MlSharedContext.Provider>
          </KibanaContextProvider>
        </QueryClientProvider>
      </I18nProvider>
    );

    // Act

    // Assert

    await waitFor(() => {
      expect(getByText('Data view')).toBeInTheDocument();
      expect(getByText(searchItems.dataView.getIndexPattern())).toBeInTheDocument();
      expect(mockOnChange).toBeCalled();
    });
  }, 10000);
});

describe('Transform: isAggNameConflict()', () => {
  test('detect aggregation name conflicts', () => {
    const aggList: PivotAggsConfigDict = {
      'the-agg-name': {
        agg: PIVOT_SUPPORTED_AGGS.AVG,
        field: 'the-field-name',
        aggName: 'the-agg-name',
        dropDownName: 'the-dropdown-name',
      },
      'the-namespaced-agg-name.namespace': {
        agg: PIVOT_SUPPORTED_AGGS.AVG,
        field: 'the-field-name',
        aggName: 'the-namespaced-agg-name.namespace',
        dropDownName: 'the-dropdown-name',
      },
    };

    const groupByList: PivotGroupByConfigDict = {
      'the-group-by-agg-name': {
        agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
        field: 'the-field-name',
        aggName: 'the-group-by-agg-name',
        dropDownName: 'the-dropdown-name',
      },
      'the-namespaced-group-by-agg-name.namespace': {
        agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
        field: 'the-field-name',
        aggName: 'the-namespaced-group-by-agg-name.namespace',
        dropDownName: 'the-dropdown-name',
      },
    };

    // no conflict, completely different name, no namespacing involved
    expect(
      getAggNameConflictToastMessages('the-other-agg-name', aggList, groupByList)
    ).toHaveLength(0);
    // no conflict, completely different name and no conflicting namespace
    expect(
      getAggNameConflictToastMessages('the-other-agg-name.namespace', aggList, groupByList)
    ).toHaveLength(0);

    // exact match conflict on aggregation name
    expect(getAggNameConflictToastMessages('the-agg-name', aggList, groupByList)).toStrictEqual([
      `An aggregation configuration with the name 'the-agg-name' already exists.`,
    ]);
    // namespace conflict with `the-agg-name` aggregation
    expect(
      getAggNameConflictToastMessages('the-agg-name.namespace', aggList, groupByList)
    ).toStrictEqual([
      `Couldn't add configuration 'the-agg-name.namespace' because of a nesting conflict with 'the-agg-name'.`,
    ]);

    // exact match conflict on group-by name
    expect(
      getAggNameConflictToastMessages('the-group-by-agg-name', aggList, groupByList)
    ).toStrictEqual([
      `A group by configuration with the name 'the-group-by-agg-name' already exists.`,
    ]);
    // namespace conflict with `the-group-by-agg-name` group-by
    expect(
      getAggNameConflictToastMessages('the-group-by-agg-name.namespace', aggList, groupByList)
    ).toStrictEqual([
      `Couldn't add configuration 'the-group-by-agg-name.namespace' because of a nesting conflict with 'the-group-by-agg-name'.`,
    ]);

    // exact match conflict on namespaced agg name
    expect(
      getAggNameConflictToastMessages('the-namespaced-agg-name.namespace', aggList, groupByList)
    ).toStrictEqual([
      `An aggregation configuration with the name 'the-namespaced-agg-name.namespace' already exists.`,
    ]);
    // no conflict, same base agg name but different namespace
    expect(
      getAggNameConflictToastMessages('the-namespaced-agg-name.namespace2', aggList, groupByList)
    ).toHaveLength(0);
    // namespace conflict because the new agg name is base name of existing nested field
    expect(
      getAggNameConflictToastMessages('the-namespaced-agg-name', aggList, groupByList)
    ).toStrictEqual([
      `Couldn't add configuration 'the-namespaced-agg-name' because of a nesting conflict with 'the-namespaced-agg-name.namespace'.`,
    ]);

    // exact match conflict on namespaced group-by name
    expect(
      getAggNameConflictToastMessages(
        'the-namespaced-group-by-agg-name.namespace',
        aggList,
        groupByList
      )
    ).toStrictEqual([
      `A group by configuration with the name 'the-namespaced-group-by-agg-name.namespace' already exists.`,
    ]);
    // no conflict, same base group-by name but different namespace
    expect(
      getAggNameConflictToastMessages(
        'the-namespaced-group-by-agg-name.namespace2',
        aggList,
        groupByList
      )
    ).toHaveLength(0);
    // namespace conflict because the new group-by name is base name of existing nested field
    expect(
      getAggNameConflictToastMessages('the-namespaced-group-by-agg-name', aggList, groupByList)
    ).toStrictEqual([
      `Couldn't add configuration 'the-namespaced-group-by-agg-name' because of a nesting conflict with 'the-namespaced-group-by-agg-name.namespace'.`,
    ]);
  });
});
