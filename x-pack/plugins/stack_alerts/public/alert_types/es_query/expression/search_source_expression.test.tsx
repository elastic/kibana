/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import React from 'react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { EsQueryAlertParams, SearchType } from '../types';
import { SearchSourceExpression } from './search_source_expression';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { act } from 'react-dom/test-utils';
import { EuiLoadingSpinner } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

const dataViewPluginMock = dataViewPluginMocks.createStartContract();
const chartsStartMock = chartPluginMock.createStartContract();
const unifiedSearchMock = unifiedSearchPluginMock.createStartContract();

const defaultSearchSourceExpressionParams: EsQueryAlertParams<SearchType.searchSource> = {
  size: 100,
  thresholdComparator: '>',
  threshold: [0],
  timeWindowSize: 15,
  timeWindowUnit: 's',
  index: ['test-index'],
  timeField: '@timestamp',
  searchType: SearchType.searchSource,
  searchConfiguration: {},
};

const searchSourceMock = {
  id: 'data_source6',
  fields: {
    query: {
      query: '',
      language: 'kuery',
    },
    filter: [],
    index: {
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      title: 'kibana_sample_data_logs',
    },
  },
  getField: (name: string) => {
    if (name === 'filter') {
      return [];
    }
    return '';
  },
};

const savedQueryMock = {
  id: 'test-id',
  attributes: {
    title: 'test-filter-set',
    description: '',
    query: {
      query: 'category.keyword : "Men\'s Shoes" ',
      language: 'kuery',
    },
    filters: [],
  },
};

jest.mock('./search_source_expression_form', () => ({
  SearchSourceExpressionForm: () => <div>search source expression form mock</div>,
}));

const dataMock = dataPluginMock.createStartContract();
(dataMock.search.searchSource.create as jest.Mock).mockImplementation(() =>
  Promise.resolve(searchSourceMock)
);
(dataMock.dataViews.getIdsWithTitle as jest.Mock).mockImplementation(() => Promise.resolve([]));
(dataMock.query.savedQueries.getSavedQuery as jest.Mock).mockImplementation(() =>
  Promise.resolve(savedQueryMock)
);

const setup = (alertParams: EsQueryAlertParams<SearchType.searchSource>) => {
  const errors = {
    size: [],
    timeField: [],
    timeWindowSize: [],
    searchConfiguration: [],
  };

  const wrapper = mountWithIntl(
    <KibanaContextProvider services={{ data: dataMock }}>
      <SearchSourceExpression
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={alertParams}
        setRuleParams={() => {}}
        setRuleProperty={() => {}}
        errors={errors}
        unifiedSearch={unifiedSearchMock}
        data={dataMock}
        dataViews={dataViewPluginMock}
        defaultActionGroupId=""
        actionGroups={[]}
        charts={chartsStartMock}
      />
    </KibanaContextProvider>
  );

  return wrapper;
};

describe('SearchSourceAlertTypeExpression', () => {
  test('should render correctly', async () => {
    let wrapper = setup(defaultSearchSourceExpressionParams).children();

    expect(wrapper.find(EuiLoadingSpinner).exists()).toBeTruthy();
    expect(wrapper.text().includes('Cant find searchSource')).toBeFalsy();

    await act(async () => {
      await nextTick();
    });
    wrapper = await wrapper.update();

    expect(wrapper.text().includes('Cant find searchSource')).toBeFalsy();
    expect(wrapper.text().includes('search source expression form mock')).toBeTruthy();
  });

  test('should render error prompt', async () => {
    (dataMock.search.searchSource.create as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error('Cant find searchSource'))
    );
    let wrapper = setup(defaultSearchSourceExpressionParams).children();

    expect(wrapper.find(EuiLoadingSpinner).exists()).toBeTruthy();
    expect(wrapper.text().includes('Cant find searchSource')).toBeFalsy();

    await act(async () => {
      await nextTick();
    });
    wrapper = await wrapper.update();

    expect(wrapper.text().includes('Cant find searchSource')).toBeTruthy();
  });
});
