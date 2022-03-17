/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import 'brace';
import { of } from 'rxjs';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { dataPluginMock } from 'src/plugins/data/public/mocks';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import {
  DataPublicPluginStart,
  IKibanaSearchResponse,
  ISearchStart,
} from 'src/plugins/data/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { EsQueryAlertParams, SearchType } from '../types';
import { EsQueryExpression } from './es_query_expression';

jest.mock('../../../../../../../src/plugins/kibana_react/public');
jest.mock('../../../../../../../src/plugins/es_ui_shared/public', () => ({
  XJson: {
    useXJsonMode: jest.fn().mockReturnValue({
      convertToJson: jest.fn(),
      setXJson: jest.fn(),
      xJson: jest.fn(),
    }),
  },
  // Mocking EuiCodeEditor, which uses React Ace under the hood
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EuiCodeEditor: (props: any) => (
    <input
      data-test-subj="mockCodeEditor"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange={(syntheticEvent: any) => {
        props.onChange(syntheticEvent.jsonString);
      }}
    />
  ),
}));
jest.mock('../../../../../triggers_actions_ui/public', () => {
  const original = jest.requireActual('../../../../../triggers_actions_ui/public');
  return {
    ...original,
    getIndexPatterns: () => {
      return ['index1', 'index2'];
    },
    getTimeFieldOptions: () => {
      return [
        {
          text: '@timestamp',
          value: '@timestamp',
        },
      ];
    },
    getFields: () => {
      return Promise.resolve([
        {
          name: '@timestamp',
          type: 'date',
        },
        {
          name: 'field',
          type: 'text',
        },
      ]);
    },
    getIndexOptions: () => {
      return Promise.resolve([
        {
          label: 'indexOption',
          options: [
            {
              label: 'index1',
              value: 'index1',
            },
            {
              label: 'index2',
              value: 'index2',
            },
          ],
        },
      ]);
    },
  };
});

const createDataPluginMock = () => {
  const dataMock = dataPluginMock.createStartContract() as DataPublicPluginStart & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    search: ISearchStart & { search: jest.MockedFunction<any> };
  };
  return dataMock;
};

const dataMock = createDataPluginMock();
const chartsStartMock = chartPluginMock.createStartContract();

const defaultEsQueryExpressionParams: EsQueryAlertParams<SearchType.esQuery> = {
  size: 100,
  thresholdComparator: '>',
  threshold: [0],
  timeWindowSize: 15,
  timeWindowUnit: 's',
  index: ['test-index'],
  timeField: '@timestamp',
  esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
};

describe('EsQueryAlertTypeExpression', () => {
  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        docLinks: {
          ELASTIC_WEBSITE_URL: '',
          DOC_LINK_VERSION: '',
          links: {
            query: {
              queryDsl: 'query-dsl.html',
            },
          },
        },
      },
    });
  });

  async function setup(alertParams: EsQueryAlertParams<SearchType.esQuery>) {
    const errors = {
      index: [],
      esQuery: [],
      size: [],
      timeField: [],
      timeWindowSize: [],
    };

    const wrapper = mountWithIntl(
      <EsQueryExpression
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

    const update = async () =>
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

    await update();
    return wrapper;
  }

  test('should render EsQueryAlertTypeExpression with expected components', async () => {
    const wrapper = await setup(defaultEsQueryExpressionParams);
    expect(wrapper.find('[data-test-subj="indexSelectPopover"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="sizeValueExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="queryJsonEditor"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="testQuerySuccess"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="testQueryError"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="thresholdExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="forLastExpression"]').exists()).toBeTruthy();

    const testQueryButton = wrapper.find('EuiButtonEmpty[data-test-subj="testQuery"]');
    expect(testQueryButton.exists()).toBeTruthy();
    expect(testQueryButton.prop('disabled')).toBe(false);
  });

  test('should render Test Query button disabled if alert params are invalid', async () => {
    const wrapper = await setup({
      ...defaultEsQueryExpressionParams,
      timeField: null,
    } as unknown as EsQueryAlertParams<SearchType.esQuery>);
    const testQueryButton = wrapper.find('EuiButtonEmpty[data-test-subj="testQuery"]');
    expect(testQueryButton.exists()).toBeTruthy();
    expect(testQueryButton.prop('disabled')).toBe(true);
  });

  test('should show success message if Test Query is successful', async () => {
    const searchResponseMock$ = of<IKibanaSearchResponse>({
      rawResponse: {
        hits: {
          total: 1234,
        },
      },
    });
    dataMock.search.search.mockImplementation(() => searchResponseMock$);
    const wrapper = await setup(defaultEsQueryExpressionParams);
    const testQueryButton = wrapper.find('EuiButtonEmpty[data-test-subj="testQuery"]');

    testQueryButton.simulate('click');
    expect(dataMock.search.search).toHaveBeenCalled();
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="testQuerySuccess"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="testQueryError"]').exists()).toBeFalsy();
    expect(wrapper.find('EuiText[data-test-subj="testQuerySuccess"]').text()).toEqual(
      `Query matched 1234 documents in the last 15s.`
    );
  });

  test('should show error message if Test Query is throws error', async () => {
    dataMock.search.search.mockImplementation(() => {
      throw new Error('What is this query');
    });
    const wrapper = await setup(defaultEsQueryExpressionParams);
    const testQueryButton = wrapper.find('EuiButtonEmpty[data-test-subj="testQuery"]');

    testQueryButton.simulate('click');
    expect(dataMock.search.search).toHaveBeenCalled();
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="testQuerySuccess"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="testQueryError"]').exists()).toBeTruthy();
  });
});
