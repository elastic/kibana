/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import React from 'react';
import { dataPluginMock } from 'src/plugins/data/public/mocks';
import { DataPublicPluginStart, ISearchStart } from 'src/plugins/data/public';
import { EsQueryAlertParams, SearchType } from '../types';
import { SearchSourceExpression } from './search_source_expression';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import { act } from 'react-dom/test-utils';
import { EuiCallOut, EuiLoadingSpinner } from '@elastic/eui';
import { ReactWrapper } from 'enzyme';

const dataMock = dataPluginMock.createStartContract() as DataPublicPluginStart & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  search: ISearchStart & { searchSource: { create: jest.MockedFunction<any> } };
};
const chartsStartMock = chartPluginMock.createStartContract();

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
  getField: (name: string) => {
    if (name === 'filter') {
      return [];
    }
    return '';
  },
};

const setup = async (alertParams: EsQueryAlertParams<SearchType.searchSource>) => {
  const errors = {
    size: [],
    timeField: [],
    timeWindowSize: [],
    searchConfiguration: [],
  };

  const wrapper = mountWithIntl(
    <SearchSourceExpression
      ruleInterval="1m"
      ruleThrottle="1m"
      alertNotifyWhen="onThrottleInterval"
      ruleParams={alertParams}
      setRuleParams={() => {}}
      setRuleProperty={() => {}}
      errors={errors}
      data={dataMock}
      defaultActionGroupId=""
      actionGroups={[]}
      charts={chartsStartMock}
    />
  );

  return wrapper;
};

const rerender = async (wrapper: ReactWrapper) => {
  const update = async () =>
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  await update();
};

describe('SearchSourceAlertTypeExpression', () => {
  test('should render loading prompt', async () => {
    dataMock.search.searchSource.create.mockImplementation(() =>
      Promise.resolve(() => searchSourceMock)
    );

    const wrapper = await setup(defaultSearchSourceExpressionParams);

    expect(wrapper.find(EuiLoadingSpinner).exists()).toBeTruthy();
  });

  test('should render error prompt', async () => {
    dataMock.search.searchSource.create.mockImplementation(() =>
      Promise.reject(() => 'test error')
    );

    const wrapper = await setup(defaultSearchSourceExpressionParams);
    await rerender(wrapper);

    expect(wrapper.find(EuiCallOut).exists()).toBeTruthy();
  });

  test('should render SearchSourceAlertTypeExpression with expected components', async () => {
    dataMock.search.searchSource.create.mockImplementation(() =>
      Promise.resolve(() => searchSourceMock)
    );

    const wrapper = await setup(defaultSearchSourceExpressionParams);
    await rerender(wrapper);

    expect(wrapper.find('[data-test-subj="sizeValueExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="thresholdExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="forLastExpression"]').exists()).toBeTruthy();
  });
});
