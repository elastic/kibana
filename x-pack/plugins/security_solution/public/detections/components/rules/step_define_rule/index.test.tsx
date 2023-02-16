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
import { useSetFieldValueWithCallback } from '../../../../common/utils/use_set_field_value_cb';
import { useRuleFromTimeline } from '../../../containers/detection_engine/rules/use_rule_from_timeline';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
jest.mock('../../../../common/components/query_bar', () => {
  return {
    QueryBar: jest.fn(({ filterQuery }) => {
      return <div data-test-subj="query-bar">{`${filterQuery.query} ${filterQuery.language}`}</div>;
    }),
  };
});
jest.mock('../eql_query_bar', () => {
  return {
    EqlQueryBar: jest.fn(({ filterQuery }) => {
      return <div data-test-subj="eql-bar">{`${filterQuery.query} ${filterQuery.language}`}</div>;
    }),
  };
});
jest.mock('../../../../common/lib/kibana');
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

jest.mock('../../../../common/utils/use_set_field_value_cb');
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

const mockUseSetFieldValueWithCallback = useSetFieldValueWithCallback as jest.Mock;
const mockUseRuleFromTimeline = useRuleFromTimeline as jest.Mock;
const setRuleTypeCallback = jest.fn();
const onOpenTimeline = jest.fn();
describe('StepDefineRule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSetFieldValueWithCallback.mockReturnValue(setRuleTypeCallback);
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
    expect(setRuleTypeCallback).not.toHaveBeenCalledWith();
  });
  it('handleSetRuleFromTimeline correctly updates eql query', () => {
    mockUseRuleFromTimeline.mockImplementation((handleSetRuleFromTimeline) => {
      handleSetRuleFromTimeline(eqlQuery);
      return { onOpenTimeline, loading: false };
    });
    render(
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
    expect(setRuleTypeCallback).toHaveBeenCalled();
  });
});
