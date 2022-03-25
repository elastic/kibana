/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../../../__mocks__/shallow_useeffect.mock';
// I don't know why eslint is saying this line is out of order
// eslint-disable-next-line import/order
import { setMockActions, setMockValues } from '../../../../../../../__mocks__/kea_logic';
import '../../../../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBasicTable } from '@elastic/eui';

import { IgnoredQueriesPanel } from './ignored_queries_panel';

describe('IgnoredQueriesPanel', () => {
  const values = {
    dataLoading: false,
    suggestions: [
      {
        query: 'foo',
        updated_at: '2021-07-08T14:35:50Z',
        promoted: ['1', '2'],
      },
    ],
    meta: {
      page: {
        current: 1,
        size: 10,
        total_results: 2,
      },
    },
  };

  const mockActions = {
    allowIgnoredQuery: jest.fn(),
    loadIgnoredQueries: jest.fn(),
    onPaginate: jest.fn(),
  };

  beforeAll(() => {
    setMockValues(values);
    setMockActions(mockActions);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getColumn = (index: number) => {
    const wrapper = shallow(<IgnoredQueriesPanel />);
    const table = wrapper.find(EuiBasicTable);
    const columns = table.prop('columns');
    return columns[index];
  };

  it('renders', () => {
    const wrapper = shallow(<IgnoredQueriesPanel />);
    expect(wrapper.find(EuiBasicTable).exists()).toBe(true);
  });

  it('show a query', () => {
    // @ts-expect-error 4.3.5 upgrade
    const column = getColumn(0).render('test query');
    expect(column).toEqual('test query');
  });

  it('has an allow action', () => {
    const column = getColumn(1);
    // @ts-ignore
    const actions = column.actions;
    actions[0].onClick('test query');
    expect(mockActions.allowIgnoredQuery).toHaveBeenCalledWith('test query');
  });

  it('fetches data on load', () => {
    shallow(<IgnoredQueriesPanel />);

    expect(mockActions.loadIgnoredQueries).toHaveBeenCalled();
  });

  it('supports pagination', () => {
    const wrapper = shallow(<IgnoredQueriesPanel />);
    wrapper.find(EuiBasicTable).simulate('change', { page: { index: 0 } });

    expect(mockActions.onPaginate).toHaveBeenCalledWith(1);
  });
});
