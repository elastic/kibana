/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { DataViewSelectPopover, DataViewSelectPopoverProps } from './data_view_select_popover';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/public';
import { indexPatternEditorPluginMock as dataViewEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import { act } from 'react-dom/test-utils';

const selectedDataView = {
  id: 'mock-data-logs-id',
  namespaces: ['default'],
  title: 'kibana_sample_data_logs',
  isTimeBased: jest.fn(),
  isPersisted: jest.fn(() => true),
  getName: () => 'kibana_sample_data_logs',
} as unknown as DataView;

const props: DataViewSelectPopoverProps = {
  onSelectDataView: () => {},
  onChangeMetaData: () => {},
  dataView: selectedDataView,
};

const dataViewIds = ['mock-data-logs-id', 'mock-ecommerce-id', 'mock-test-id'];

const dataViewOptions = [
  selectedDataView,
  {
    id: 'mock-flyghts-id',
    namespaces: ['default'],
    title: 'kibana_sample_data_flights',
    isTimeBased: jest.fn(),
    isPersisted: jest.fn(() => true),
    getName: () => 'kibana_sample_data_flights',
  },
  {
    id: 'mock-ecommerce-id',
    namespaces: ['default'],
    title: 'kibana_sample_data_ecommerce',
    typeMeta: {},
    isTimeBased: jest.fn(),
    isPersisted: jest.fn(() => true),
    getName: () => 'kibana_sample_data_ecommerce',
  },
  {
    id: 'mock-test-id',
    namespaces: ['default'],
    title: 'test',
    typeMeta: {},
    isTimeBased: jest.fn(),
    isPersisted: jest.fn(() => true),
    getName: () => 'test',
  },
];

const mount = () => {
  const dataViewsMock = dataViewPluginMocks.createStartContract();
  dataViewsMock.getIds = jest.fn().mockImplementation(() => Promise.resolve(dataViewIds));
  dataViewsMock.get = jest
    .fn()
    .mockImplementation((id: string) =>
      Promise.resolve(dataViewOptions.find((current) => current.id === id))
    );
  const dataViewEditorMock = dataViewEditorPluginMock.createStartContract();

  return {
    wrapper: mountWithIntl(
      <KibanaContextProvider
        services={{ dataViews: dataViewsMock, dataViewEditor: dataViewEditorMock }}
      >
        <DataViewSelectPopover {...props} />
      </KibanaContextProvider>
    ),
    dataViewsMock,
  };
};

describe('DataViewSelectPopover', () => {
  test('renders properly', async () => {
    const { wrapper, dataViewsMock } = mount();

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(dataViewsMock.getIds).toHaveBeenCalled();
    expect(wrapper.find('[data-test-subj="selectDataViewExpression"]').exists()).toBeTruthy();

    const getIdsResult = await dataViewsMock.getIds.mock.results[0].value;
    expect(getIdsResult).toBe(dataViewIds);
  });
});
