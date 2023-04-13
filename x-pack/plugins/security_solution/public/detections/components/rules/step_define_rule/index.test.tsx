/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { StepDefineRule, aggregatableFields } from '.';
import { stepDefineDefaultValue } from '../../../pages/detection_engine/rules/utils';
import { mockBrowserFields } from '../../../../common/containers/source/mock';
import { useRuleFromTimeline } from '../../../containers/detection_engine/rules/use_rule_from_timeline';
import { fireEvent, render, within } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
jest.mock('../../../../common/components/query_bar', () => {
  return {
    QueryBar: jest.fn(({ filterQuery }) => {
      return <div data-test-subj="query-bar">{`${filterQuery.query} ${filterQuery.language}`}</div>;
    }),
  };
});

const mockRedirectLegacyUrl = jest.fn();
const mockGetLegacyUrlConflict = jest.fn();
jest.mock('../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...originalModule,
    useToasts: jest.fn().mockReturnValue({
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      remove: jest.fn(),
    }),
    useKibana: () => ({
      services: {
        ...originalModule.useKibana().services,
        storage: {
          get: jest.fn().mockReturnValue(true),
        },
        application: {
          getUrlForApp: (appId: string, options?: { path?: string }) =>
            `/app/${appId}${options?.path}`,
          navigateToApp: jest.fn(),
          capabilities: {
            actions: {
              delete: true,
              save: true,
              show: true,
            },
          },
        },
        data: {
          dataViews: {
            getIdsWithTitle: async () =>
              Promise.resolve([{ id: 'myfakeid', title: 'hello*,world*,refreshed*' }]),
            create: async ({ title }: { title: string }) =>
              Promise.resolve({
                id: 'myfakeid',
                matchedIndices: ['hello', 'world', 'refreshed'],
                fields: [
                  {
                    name: 'bytes',
                    type: 'number',
                    esTypes: ['long'],
                    aggregatable: true,
                    searchable: true,
                    count: 10,
                    readFromDocValues: true,
                    scripted: false,
                    isMapped: true,
                  },
                  {
                    name: 'ssl',
                    type: 'boolean',
                    esTypes: ['boolean'],
                    aggregatable: true,
                    searchable: true,
                    count: 20,
                    readFromDocValues: true,
                    scripted: false,
                    isMapped: true,
                  },
                  {
                    name: '@timestamp',
                    type: 'date',
                    esTypes: ['date'],
                    aggregatable: true,
                    searchable: true,
                    count: 30,
                    readFromDocValues: true,
                    scripted: false,
                    isMapped: true,
                  },
                ],
                getIndexPattern: () => 'hello*,world*,refreshed*',
              }),
            get: async (dataViewId: string, displayErrors?: boolean, refreshFields = false) =>
              Promise.resolve({
                id: dataViewId,
                matchedIndices: refreshFields
                  ? ['hello', 'world', 'refreshed']
                  : ['hello', 'world'],
                fields: [
                  {
                    name: 'bytes',
                    type: 'number',
                    esTypes: ['long'],
                    aggregatable: true,
                    searchable: true,
                    count: 10,
                    readFromDocValues: true,
                    scripted: false,
                    isMapped: true,
                  },
                  {
                    name: 'ssl',
                    type: 'boolean',
                    esTypes: ['boolean'],
                    aggregatable: true,
                    searchable: true,
                    count: 20,
                    readFromDocValues: true,
                    scripted: false,
                    isMapped: true,
                  },
                  {
                    name: '@timestamp',
                    type: 'date',
                    esTypes: ['date'],
                    aggregatable: true,
                    searchable: true,
                    count: 30,
                    readFromDocValues: true,
                    scripted: false,
                    isMapped: true,
                  },
                ],
                getIndexPattern: () => 'hello*,world*,refreshed*',
              }),
          },
          search: {
            search: () => ({
              subscribe: () => ({
                unsubscribe: jest.fn(),
              }),
            }),
          },
        },
        spaces: {
          ui: {
            components: { getLegacyUrlConflict: mockGetLegacyUrlConflict },
            redirectLegacyUrl: mockRedirectLegacyUrl,
          },
        },
      },
    }),
  };
});
jest.mock('../../../../common/hooks/use_selector', () => {
  const actual = jest.requireActual('../../../../common/hooks/use_selector');
  return {
    ...actual,
    useDeepEqualSelector: () => ({
      kibanaDataViews: [{ id: 'world' }],
      sourcererScope: 'my-selected-dataview-id',
      selectedDataView: {
        id: 'security-solution',
        browserFields: mockBrowserFields,
        patternList: [],
      },
    }),
  };
});
jest.mock('../../../../common/components/link_to', () => {
  const originalModule = jest.requireActual('../../../../common/components/link_to');
  return {
    ...originalModule,
    getTimelineUrl: jest.fn(),
    useFormatUrl: jest.fn().mockReturnValue({
      formatUrl: jest.fn().mockImplementation((path: string) => path),
    }),
  };
});
jest.mock('../../../../common/containers/sourcerer', () => {
  const actual = jest.requireActual('../../../../common/containers/sourcerer');
  return {
    ...actual,
    useSourcererDataView: jest
      .fn()
      .mockReturnValue({ indexPattern: ['fakeindex'], loading: false }),
  };
});
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '/alerts' }) };
});

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: jest.fn(),
  };
});

jest.mock('../../../containers/detection_engine/rules/use_rule_from_timeline');

test('aggregatableFields', function () {
  expect(
    aggregatableFields([
      {
        name: 'error.message',
        type: 'string',
        esTypes: ['text'],
        searchable: true,
        aggregatable: false,
        readFromDocValues: false,
      },
    ])
  ).toEqual([]);
});

test('aggregatableFields with aggregatable: true', function () {
  expect(
    aggregatableFields([
      {
        name: 'error.message',
        type: 'string',
        esTypes: ['text'],
        searchable: true,
        aggregatable: false,
        readFromDocValues: false,
      },
      {
        name: 'file.path',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        readFromDocValues: false,
      },
    ])
  ).toEqual([
    {
      name: 'file.path',
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: false,
    },
  ]);
});

const mockUseRuleFromTimeline = useRuleFromTimeline as jest.Mock;
const onOpenTimeline = jest.fn();
describe('StepDefineRule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRuleFromTimeline.mockReturnValue({ onOpenTimeline, loading: false });
  });
  it('renders correctly', () => {
    const wrapper = shallow(
      <StepDefineRule
        isReadOnlyView={false}
        isLoading={false}
        indicesConfig={[]}
        threatIndicesConfig={[]}
        defaultValues={stepDefineDefaultValue}
      />
    );

    expect(wrapper.find('Form[data-test-subj="stepDefineRule"]')).toHaveLength(1);
  });

  const kqlQuery = {
    index: ['.alerts-security.alerts-default', 'logs-*', 'packetbeat-*'],
    queryBar: {
      filters: [],
      query: {
        query: 'host.name:*',
        language: 'kuery',
      },
      saved_id: null,
    },
  };

  const eqlQuery = {
    index: ['.alerts-security.alerts-default', 'logs-*', 'packetbeat-*'],
    queryBar: {
      filters: [],
      query: {
        query: 'process where true',
        language: 'eql',
      },
      saved_id: null,
    },
    eqlOptions: {
      eventCategoryField: 'cool.field',
      tiebreakerField: 'another.field',
      timestampField: 'cool.@timestamp',
      query: 'process where true',
      size: 77,
    },
  };
  it('handleSetRuleFromTimeline correctly updates the query', () => {
    mockUseRuleFromTimeline.mockImplementation((handleSetRuleFromTimeline) => {
      handleSetRuleFromTimeline(kqlQuery);
      return { onOpenTimeline, loading: false };
    });
    const { getAllByTestId } = render(
      <TestProviders>
        <StepDefineRule
          isReadOnlyView={false}
          isLoading={false}
          indicesConfig={[]}
          threatIndicesConfig={[]}
          defaultValues={stepDefineDefaultValue}
        />
      </TestProviders>
    );
    expect(getAllByTestId('query-bar')[0].textContent).toEqual(
      `${kqlQuery.queryBar.query.query} ${kqlQuery.queryBar.query.language}`
    );
  });
  it('handleSetRuleFromTimeline correctly updates eql query', async () => {
    mockUseRuleFromTimeline
      .mockImplementationOnce(() => ({ onOpenTimeline, loading: false }))
      .mockImplementationOnce((handleSetRuleFromTimeline) => {
        handleSetRuleFromTimeline(eqlQuery);
        return { onOpenTimeline, loading: false };
      });
    const { getByTestId } = render(
      <TestProviders>
        <StepDefineRule
          isReadOnlyView={false}
          isLoading={false}
          indicesConfig={[]}
          threatIndicesConfig={[]}
          defaultValues={stepDefineDefaultValue}
        />
      </TestProviders>
    );
    expect(getByTestId(`eqlQueryBarTextInput`).textContent).toEqual(eqlQuery.queryBar.query.query);
    fireEvent.click(getByTestId(`eql-settings-trigger`));
    expect(
      within(getByTestId(`eql-event-category-field`)).queryByText(
        eqlQuery.eqlOptions.eventCategoryField
      )
    ).toBeInTheDocument();
    expect(
      within(getByTestId(`eql-tiebreaker-field`)).queryByText(eqlQuery.eqlOptions.tiebreakerField)
    ).toBeInTheDocument();
    expect(
      within(getByTestId(`eql-timestamp-field`)).queryByText(eqlQuery.eqlOptions.timestampField)
    ).toBeInTheDocument();
  });
});
