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
import { Subject } from 'rxjs';
import { ISearchSource } from '@kbn/data-plugin/common';
import { IUiSettingsClient } from '@kbn/core/public';
import { findTestSubject } from '@elastic/eui/lib/test';
import { EuiCopy, EuiLoadingSpinner } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ReactWrapper } from 'enzyme';

const dataViewPluginMock = dataViewPluginMocks.createStartContract();
const chartsStartMock = chartPluginMock.createStartContract();
const unifiedSearchMock = unifiedSearchPluginMock.createStartContract();
export const uiSettingsMock = {
  get: jest.fn(),
} as unknown as IUiSettingsClient;

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

const mockSearchResult = new Subject();
const testResultComplete = {
  rawResponse: {
    hits: {
      total: 1234,
    },
  },
};

const testResultPartial = {
  partial: true,
  running: true,
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
  setField: jest.fn(),
  createCopy: jest.fn(() => {
    return searchSourceMock;
  }),
  setParent: jest.fn(() => {
    return searchSourceMock;
  }),
  fetch$: jest.fn(() => {
    return mockSearchResult;
  }),
  getSearchRequestBody: jest.fn(() => ({
    fields: [
      {
        field: '@timestamp',
        format: 'date_time',
      },
      {
        field: 'timestamp',
        format: 'date_time',
      },
      {
        field: 'utc_time',
        format: 'date_time',
      },
    ],
    script_fields: {},
    stored_fields: ['*'],
    runtime_mappings: {
      hour_of_day: {
        type: 'long',
        script: {
          source: "emit(doc['timestamp'].value.getHour());",
        },
      },
    },
    _source: {
      excludes: [],
    },
    query: {
      bool: {
        must: [],
        filter: [
          {
            bool: {
              must_not: {
                bool: {
                  should: [
                    {
                      match: {
                        response: '200',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            },
          },
          {
            range: {
              timestamp: {
                format: 'strict_date_optional_time',
                gte: '2022-06-19T02:49:51.192Z',
                lte: '2022-06-24T02:49:51.192Z',
              },
            },
          },
        ],
        should: [],
        must_not: [],
      },
    },
  })),
} as unknown as ISearchSource;

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

const dataMock = dataPluginMock.createStartContract();
(dataMock.search.searchSource.create as jest.Mock).mockImplementation(() =>
  Promise.resolve(searchSourceMock)
);
(dataMock.dataViews.getIdsWithTitle as jest.Mock).mockImplementation(() => Promise.resolve([]));
(dataMock.query.savedQueries.getSavedQuery as jest.Mock).mockImplementation(() =>
  Promise.resolve(savedQueryMock)
);
dataMock.query.savedQueries.findSavedQueries = jest.fn(() =>
  Promise.resolve({ total: 0, queries: [] })
);

const setup = (alertParams: EsQueryAlertParams<SearchType.searchSource>) => {
  const errors = {
    size: [],
    timeField: [],
    timeWindowSize: [],
    searchConfiguration: [],
  };

  return mountWithIntl(
    <KibanaContextProvider services={{ data: dataMock, uiSettings: uiSettingsMock }}>
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
};

describe('SearchSourceAlertTypeExpression', () => {
  test('should render correctly', async () => {
    let wrapper = setup(defaultSearchSourceExpressionParams);

    expect(wrapper.find(EuiLoadingSpinner).exists()).toBeTruthy();

    await act(async () => {
      await nextTick();
    });
    wrapper = await wrapper.update();
    expect(findTestSubject(wrapper, 'thresholdExpression')).toBeTruthy();
  });

  test('should show success message if Test Query is successful', async () => {
    let wrapper = setup(defaultSearchSourceExpressionParams);
    await act(async () => {
      await nextTick();
    });
    wrapper = await wrapper.update();
    await act(async () => {
      findTestSubject(wrapper, 'testQuery').simulate('click');
      wrapper.update();
    });
    wrapper = await wrapper.update();

    await act(async () => {
      mockSearchResult.next(testResultPartial);
      mockSearchResult.next(testResultComplete);
      mockSearchResult.complete();
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="testQuerySuccess"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="testQueryError"]').exists()).toBeFalsy();
    expect(wrapper.find('EuiText[data-test-subj="testQuerySuccess"]').text()).toEqual(
      `Query matched 1234 documents in the last 15s.`
    );
  });

  it('should copy the query to the clipboard when the copy query button is clicked', async () => {
    let wrapper = null as unknown as ReactWrapper;
    await act(async () => {
      wrapper = setup(defaultSearchSourceExpressionParams);
    });
    wrapper.update();
    // EuiCopy.copy() calls document.execCommand() which isn't support in jsdom, so mock it
    const copy = jest.spyOn(wrapper.find<EuiCopy>(EuiCopy).instance(), 'copy').mockImplementation();
    await act(async () => {
      findTestSubject(wrapper, 'copyQuery').simulate('click');
    });
    wrapper.update();
    expect(copy).toHaveBeenCalled();
    expect(JSON.parse(wrapper.find(EuiCopy).props().textToCopy)).toMatchInlineSnapshot(`
      Object {
        "_source": Object {
          "excludes": Array [],
        },
        "fields": Array [
          Object {
            "field": "@timestamp",
            "format": "date_time",
          },
          Object {
            "field": "timestamp",
            "format": "date_time",
          },
          Object {
            "field": "utc_time",
            "format": "date_time",
          },
        ],
        "query": Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "must_not": Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match": Object {
                            "response": "200",
                          },
                        },
                      ],
                    },
                  },
                },
              },
              Object {
                "range": Object {
                  "timestamp": Object {
                    "format": "strict_date_optional_time",
                    "gte": "2022-06-19T02:49:51.192Z",
                    "lte": "2022-06-24T02:49:51.192Z",
                  },
                },
              },
            ],
            "must": Array [],
            "must_not": Array [],
            "should": Array [],
          },
        },
        "runtime_mappings": Object {
          "hour_of_day": Object {
            "script": Object {
              "source": "emit(doc['timestamp'].value.getHour());",
            },
            "type": "long",
          },
        },
        "script_fields": Object {},
        "stored_fields": Array [
          "*",
        ],
      }
    `);
  });

  test('should render error prompt', async () => {
    (dataMock.search.searchSource.create as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error('Cant find searchSource'))
    );
    let wrapper = setup(defaultSearchSourceExpressionParams);

    expect(wrapper.find(EuiLoadingSpinner).exists()).toBeTruthy();
    expect(wrapper.text().includes('Cant find searchSource')).toBeFalsy();

    await act(async () => {
      await nextTick();
    });
    wrapper = await wrapper.update();

    expect(wrapper.text().includes('Cant find searchSource')).toBeTruthy();
  });
});
