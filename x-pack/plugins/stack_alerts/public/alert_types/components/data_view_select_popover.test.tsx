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
import { act } from 'react-dom/test-utils';

const props: DataViewSelectPopoverProps = {
  onSelectDataView: () => {},
  dataViewName: 'kibana_sample_data_logs',
  dataViewId: 'mock-data-logs-id',
};

const dataViewOptions = [
  {
    id: 'mock-data-logs-id',
    namespaces: ['default'],
    title: 'kibana_sample_data_logs',
  },
  {
    id: 'mock-flyghts-id',
    namespaces: ['default'],
    title: 'kibana_sample_data_flights',
  },
  {
    id: 'mock-ecommerce-id',
    namespaces: ['default'],
    title: 'kibana_sample_data_ecommerce',
    typeMeta: {},
  },
  {
    id: 'mock-test-id',
    namespaces: ['default'],
    title: 'test',
    typeMeta: {},
  },
];

const mount = () => {
  const dataViewsMock = dataViewPluginMocks.createStartContract();
  dataViewsMock.getIdsWithTitle.mockImplementation(() => Promise.resolve(dataViewOptions));

  return {
    wrapper: mountWithIntl(
      <KibanaContextProvider services={{ data: { dataViews: dataViewsMock } }}>
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

    expect(dataViewsMock.getIdsWithTitle).toHaveBeenCalled();
    expect(wrapper.find('[data-test-subj="selectDataViewExpression"]').exists()).toBeTruthy();

    const getIdsWithTitleResult = await dataViewsMock.getIdsWithTitle.mock.results[0].value;
    expect(getIdsWithTitleResult).toBe(dataViewOptions);
  });
});
