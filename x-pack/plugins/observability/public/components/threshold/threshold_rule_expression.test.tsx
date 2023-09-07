/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { queryClient } from '@kbn/osquery-plugin/public/query_client';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';

import { Comparator } from '../../../common/threshold_rule/types';
import { MetricsExplorerMetric } from '../../../common/threshold_rule/metrics_explorer';
import { useKibana } from '../../utils/kibana_react';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import Expressions from './threshold_rule_expression';

jest.mock('../../utils/kibana_react');

const useKibanaMock = useKibana as jest.Mock;

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    ...kibanaStartMock.startContract(),
  });
};

const dataViewMock = dataViewPluginMocks.createStartContract();

describe('Expression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  async function setup(currentOptions: {
    metrics?: MetricsExplorerMetric[];
    filterQuery?: string;
    groupBy?: string;
  }) {
    const ruleParams = {
      criteria: [],
      groupBy: undefined,
      filterQuery: '',
      sourceId: 'default',
      searchConfiguration: {},
    };
    const wrapper = mountWithIntl(
      <QueryClientProvider client={queryClient}>
        <Expressions
          ruleInterval="1m"
          ruleThrottle="1m"
          alertNotifyWhen="onThrottleInterval"
          ruleParams={ruleParams}
          errors={{}}
          setRuleParams={(key, value) => Reflect.set(ruleParams, key, value)}
          setRuleProperty={() => {}}
          metadata={{
            currentOptions,
            adHocDataViewList: [],
          }}
          dataViews={dataViewMock}
          onChangeMetaData={jest.fn()}
        />
      </QueryClientProvider>
    );

    const update = async () =>
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

    await update();

    return { wrapper, update, ruleParams };
  }

  it('should prefill the alert using the context metadata', async () => {
    const currentOptions = {
      groupBy: 'host.hostname',
      filterQuery: 'foo',
      metrics: [
        { aggregation: 'avg', field: 'system.load.1' },
        { aggregation: 'cardinality', field: 'system.cpu.user.pct' },
      ] as MetricsExplorerMetric[],
    };
    const { ruleParams } = await setup(currentOptions);
    expect(ruleParams.groupBy).toBe('host.hostname');
    expect(ruleParams.filterQuery).toBe('foo');
    expect(ruleParams.criteria).toEqual([
      {
        metric: 'system.load.1',
        comparator: Comparator.GT,
        threshold: [],
        timeSize: 1,
        timeUnit: 'm',
        aggType: 'avg',
      },
      {
        metric: 'system.cpu.user.pct',
        comparator: Comparator.GT,
        threshold: [],
        timeSize: 1,
        timeUnit: 'm',
        aggType: 'cardinality',
      },
    ]);
  });

  it('should show an error message when searchSource throws an error', async () => {
    const currentOptions = {
      groupBy: 'host.hostname',
      filterQuery: 'foo',
      metrics: [
        { aggregation: 'avg', field: 'system.load.1' },
        { aggregation: 'cardinality', field: 'system.cpu.user.pct' },
      ] as MetricsExplorerMetric[],
    };
    const errorMessage = 'Error in searchSource create';
    const kibanaMock = kibanaStartMock.startContract();
    useKibanaMock.mockReturnValue({
      ...kibanaMock,
      services: {
        ...kibanaMock.services,
        data: {
          dataViews: {
            create: jest.fn(),
          },
          query: {
            timefilter: {
              timefilter: jest.fn(),
            },
          },
          search: {
            searchSource: {
              create: jest.fn(() => {
                throw new Error(errorMessage);
              }),
            },
          },
        },
      },
    });
    const { wrapper } = await setup(currentOptions);
    expect(wrapper.find(`[data-test-subj="thresholdRuleExpressionError"]`).first().text()).toBe(
      errorMessage
    );
  });

  it('should show no timestamp error when selected data view does not have a timeField', async () => {
    const currentOptions = {
      groupBy: 'host.hostname',
      filterQuery: 'foo',
      metrics: [
        { aggregation: 'avg', field: 'system.load.1' },
        { aggregation: 'cardinality', field: 'system.cpu.user.pct' },
      ] as MetricsExplorerMetric[],
    };
    const mockedIndex = {
      id: 'c34a7c79-a88b-4b4a-ad19-72f6d24104e4',
      title: 'metrics-fake_hosts',
      fieldFormatMap: {},
      typeMeta: {},
      // We should not provide timeFieldName here to show thresholdRuleDataViewErrorNoTimestamp error
      // timeFieldName: '@timestamp',
    };
    const mockedDataView = {
      getIndexPattern: () => 'mockedIndexPattern',
      getName: () => 'mockedName',
      ...mockedIndex,
    };
    const mockedSearchSource = {
      id: 'data_source',
      shouldOverwriteDataViewType: false,
      requestStartHandlers: [],
      inheritOptions: {},
      history: [],
      fields: {
        index: mockedIndex,
      },
      getField: jest.fn(() => mockedDataView),
      dependencies: {
        aggs: {
          types: {},
        },
      },
    };
    const kibanaMock = kibanaStartMock.startContract();
    useKibanaMock.mockReturnValue({
      ...kibanaMock,
      services: {
        ...kibanaMock.services,
        data: {
          dataViews: {
            create: jest.fn(),
          },
          query: {
            timefilter: {
              timefilter: jest.fn(),
            },
          },
          search: {
            searchSource: {
              create: jest.fn(() => mockedSearchSource),
            },
          },
        },
      },
    });
    const { wrapper } = await setup(currentOptions);
    expect(
      wrapper.find(`[data-test-subj="thresholdRuleDataViewErrorNoTimestamp"]`).first().text()
    ).toBe(
      'The selected data view does not have a timestamp field, please select another data view.'
    );
  });
});
