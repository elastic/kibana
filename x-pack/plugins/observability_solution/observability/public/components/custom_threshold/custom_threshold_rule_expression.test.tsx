/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleTypeParams } from '@kbn/alerting-plugin/common';
import { Query } from '@kbn/data-plugin/common';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { queryClient } from '@kbn/osquery-plugin/public/query_client';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react-dom/test-utils';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { Aggregators } from '../../../common/custom_threshold_rule/types';
import { useKibana } from '../../utils/kibana_react';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import Expressions from './custom_threshold_rule_expression';
import { AlertParams, CustomThresholdPrefillOptions } from './types';

jest.mock('../../utils/kibana_react');
jest.mock('./components/rule_condition_chart/rule_condition_chart', () => ({
  RuleConditionChart: jest.fn(() => <div data-test-subj="RuleConditionChart" />),
}));

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

  async function setup(
    currentOptions?: CustomThresholdPrefillOptions,
    customRuleParams?: Record<string, unknown>
  ) {
    const ruleParams: RuleTypeParams & AlertParams = {
      criteria: [],
      groupBy: undefined,
      sourceId: 'default',
      searchConfiguration: {
        index: 'mockedIndex',
        query: {
          query: '',
          language: 'kuery',
        },
      },
      ...customRuleParams,
    };
    const metadata = {
      currentOptions,
      adHocDataViewList: [],
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
          metadata={metadata}
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

  const updateUseKibanaMock = (mockedIndex: any) => {
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
      setField: jest.fn(),
      getSerializedFields: jest.fn().mockReturnValue({ index: mockedIndex }),
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
            getDefaultDataView: jest.fn(),
          },
          query: {
            timefilter: {
              timefilter: jest.fn(),
            },
            queryString: {
              getDefaultQuery: jest.fn(),
            },
          },
          search: {
            searchSource: {
              create: jest.fn(() => mockedSearchSource),
              createEmpty: jest.fn(() => mockedSearchSource),
            },
          },
        },
      },
    });
  };

  it('should use default metrics', async () => {
    const { ruleParams } = await setup();
    expect(ruleParams.criteria).toEqual([
      {
        metrics: [
          {
            name: 'A',
            aggType: Aggregators.COUNT,
          },
        ],
        comparator: COMPARATORS.GREATER_THAN,
        threshold: [100],
        timeSize: 1,
        timeUnit: 'm',
      },
    ]);
  });

  it('should prefill the rule using the context metadata', async () => {
    const index = 'changedMockedIndex';
    const currentOptions: CustomThresholdPrefillOptions = {
      alertOnGroupDisappear: false,
      groupBy: ['host.hostname'],
      searchConfiguration: {
        index,
        query: {
          query: 'foo',
          language: 'kuery',
        },
      },
      criteria: [
        {
          metrics: [
            { name: 'A', aggType: Aggregators.AVERAGE, field: 'system.load.1' },
            { name: 'B', aggType: Aggregators.CARDINALITY, field: 'system.cpu.user.pct' },
          ],
          comparator: COMPARATORS.LESS_THAN_OR_EQUALS,
          equation: 'A * B',
          label: 'prefill label',
          threshold: [500],
          timeSize: 7,
          timeUnit: 'h',
        },
      ],
    };

    const { ruleParams } = await setup(currentOptions, { searchConfiguration: undefined });

    expect(ruleParams.alertOnGroupDisappear).toEqual(false);
    expect(ruleParams.groupBy).toEqual(['host.hostname']);
    expect((ruleParams.searchConfiguration.query as Query).query).toBe('foo');
    expect(ruleParams.searchConfiguration.index).toBe(index);
    expect(ruleParams.criteria).toEqual([
      {
        metrics: [
          { name: 'A', aggType: Aggregators.AVERAGE, field: 'system.load.1' },
          { name: 'B', aggType: Aggregators.CARDINALITY, field: 'system.cpu.user.pct' },
        ],
        comparator: COMPARATORS.LESS_THAN_OR_EQUALS,
        equation: 'A * B',
        label: 'prefill label',
        threshold: [500],
        timeSize: 7,
        timeUnit: 'h',
      },
    ]);
  });

  it('should show an error message when searchSource throws an error', async () => {
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
    const { wrapper } = await setup();
    expect(wrapper.find(`[data-test-subj="thresholdRuleExpressionError"]`).first().text()).toBe(
      errorMessage
    );
  });

  it('should show no timestamp error when selected data view does not have a timeField', async () => {
    const mockedIndex = {
      id: 'c34a7c79-a88b-4b4a-ad19-72f6d24104e4',
      title: 'metrics-fake_hosts',
      fieldFormatMap: {},
      typeMeta: {},
      // We should not provide timeFieldName here to show thresholdRuleDataViewErrorNoTimestamp error
      // timeFieldName: '@timestamp',
    };
    updateUseKibanaMock(mockedIndex);
    const { wrapper } = await setup();
    expect(
      wrapper.find(`[data-test-subj="thresholdRuleDataViewErrorNoTimestamp"]`).first().text()
    ).toBe(
      'The selected data view does not have a timestamp field, please select another data view.'
    );
  });

  it('should use output of getSerializedFields() as searchConfiguration', async () => {
    const mockedIndex = {
      id: 'c34a7c79-a88b-4b4a-ad19-72f6d24104e4',
      title: 'metrics-fake_hosts',
      fieldFormatMap: {},
      typeMeta: {},
      timeFieldName: '@timestamp',
    };
    updateUseKibanaMock(mockedIndex);
    const { ruleParams } = await setup(undefined, { searchConfiguration: undefined });
    expect(ruleParams.searchConfiguration).toEqual({
      index: mockedIndex,
    });
  });
});
