/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { EsqlQueryExpression } from './esql_query_expression';
import { EsQueryRuleParams, SearchType } from '../types';

jest.mock('../validation', () => ({
  hasExpressionValidationErrors: jest.fn(),
}));
const { hasExpressionValidationErrors } = jest.requireMock('../validation');

jest.mock('@kbn/text-based-editor', () => ({
  fetchFieldsFromESQL: jest.fn(),
}));
const { fetchFieldsFromESQL } = jest.requireMock('@kbn/text-based-editor');
const { getFields } = jest.requireMock('@kbn/triggers-actions-ui-plugin/public');

const AppWrapper: React.FC<{ children: React.ReactElement }> = React.memo(({ children }) => (
  <I18nProvider>{children}</I18nProvider>
));

const dataMock = dataPluginMock.createStartContract();
const dataViewMock = dataViewPluginMocks.createStartContract();
const unifiedSearchMock = unifiedSearchPluginMock.createStartContract();
const chartsStartMock = chartPluginMock.createStartContract();

const defaultEsqlQueryExpressionParams: EsQueryRuleParams<SearchType.esqlQuery> = {
  size: 100,
  thresholdComparator: '>',
  threshold: [0],
  timeWindowSize: 15,
  timeWindowUnit: 's',
  index: ['test-index'],
  timeField: '@timestamp',
  aggType: 'count',
  groupBy: 'all',
  searchType: SearchType.esqlQuery,
  esqlQuery: { esql: '' },
  excludeHitsFromPreviousRun: false,
};

describe('EsqlQueryRuleTypeExpression', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    hasExpressionValidationErrors.mockReturnValue(false);
  });

  it('should render EsqlQueryRuleTypeExpression with expected components', () => {
    const result = render(
      <EsqlQueryExpression
        unifiedSearch={unifiedSearchMock}
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={defaultEsqlQueryExpressionParams}
        setRuleParams={() => {}}
        setRuleProperty={() => {}}
        errors={{ esqlQuery: [], timeField: [], timeWindowSize: [] }}
        data={dataMock}
        dataViews={dataViewMock}
        defaultActionGroupId=""
        actionGroups={[]}
        charts={chartsStartMock}
        onChangeMetaData={() => {}}
      />,
      {
        wrapper: AppWrapper,
      }
    );

    expect(result.getByTestId('queryEsqlEditor')).toBeInTheDocument();
    expect(result.getByTestId('timeFieldSelect')).toBeInTheDocument();
    expect(result.getByTestId('timeWindowSizeNumber')).toBeInTheDocument();
    expect(result.getByTestId('timeWindowUnitSelect')).toBeInTheDocument();
    expect(result.queryByTestId('testQuerySuccess')).not.toBeInTheDocument();
    expect(result.queryByTestId('testQueryError')).not.toBeInTheDocument();
  });

  test('should render Test Query button disabled if alert params are invalid', async () => {
    hasExpressionValidationErrors.mockReturnValue(true);
    const result = render(
      <EsqlQueryExpression
        unifiedSearch={unifiedSearchMock}
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={defaultEsqlQueryExpressionParams}
        setRuleParams={() => {}}
        setRuleProperty={() => {}}
        errors={{ esqlQuery: [], timeField: [], timeWindowSize: [] }}
        data={dataMock}
        dataViews={dataViewMock}
        defaultActionGroupId=""
        actionGroups={[]}
        charts={chartsStartMock}
        onChangeMetaData={() => {}}
      />,
      {
        wrapper: AppWrapper,
      }
    );

    const button = result.getByTestId('testQuery');
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  test('should show success message if Test Query is successful', async () => {
    fetchFieldsFromESQL.mockResolvedValue({
      type: 'datatable',
      columns: [
        { id: '@timestamp', name: '@timestamp', meta: { type: 'date' } },
        { id: 'ecs.version', name: 'ecs.version', meta: { type: 'string' } },
        { id: 'error.code', name: 'error.code', meta: { type: 'string' } },
      ],
      rows: [
        {
          '@timestamp': '2023-07-12T13:32:04.174Z',
          'ecs.version': '1.8.0',
          'error.code': null,
        },
      ],
    });
    getFields.mockResolvedValue([]);
    const result = render(
      <EsqlQueryExpression
        unifiedSearch={unifiedSearchMock}
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={defaultEsqlQueryExpressionParams}
        setRuleParams={() => {}}
        setRuleProperty={() => {}}
        errors={{ esqlQuery: [], timeField: [], timeWindowSize: [] }}
        data={dataMock}
        dataViews={dataViewMock}
        defaultActionGroupId=""
        actionGroups={[]}
        charts={chartsStartMock}
        onChangeMetaData={() => {}}
      />,
      {
        wrapper: AppWrapper,
      }
    );

    fireEvent.click(result.getByTestId('testQuery'));
    await waitFor(() => expect(fetchFieldsFromESQL).toBeCalled());

    expect(result.getByTestId('testQuerySuccess')).toBeInTheDocument();
    expect(result.getByText('Query matched 1 documents in the last 15s.')).toBeInTheDocument();
    expect(result.queryByTestId('testQueryError')).not.toBeInTheDocument();
  });

  test('should show error message if Test Query is throws error', async () => {
    fetchFieldsFromESQL.mockRejectedValue('Error getting test results.!');
    const result = render(
      <EsqlQueryExpression
        unifiedSearch={unifiedSearchMock}
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={defaultEsqlQueryExpressionParams}
        setRuleParams={() => {}}
        setRuleProperty={() => {}}
        errors={{ esqlQuery: [], timeField: [], timeWindowSize: [] }}
        data={dataMock}
        dataViews={dataViewMock}
        defaultActionGroupId=""
        actionGroups={[]}
        charts={chartsStartMock}
        onChangeMetaData={() => {}}
      />,
      {
        wrapper: AppWrapper,
      }
    );

    fireEvent.click(result.getByTestId('testQuery'));
    await waitFor(() => expect(fetchFieldsFromESQL).toBeCalled());

    expect(result.queryByTestId('testQuerySuccess')).not.toBeInTheDocument();
    expect(result.getByTestId('testQueryError')).toBeInTheDocument();
  });
});
