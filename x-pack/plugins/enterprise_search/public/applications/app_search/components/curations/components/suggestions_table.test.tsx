/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockKibanaValues, setMockValues } from '../../../../__mocks__/kea_logic';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBasicTable } from '@elastic/eui';

import { SuggestionsTable } from './suggestions_table';

describe('SuggestionsTable', () => {
  const { navigateToUrl } = mockKibanaValues;

  const values = {
    engineName: 'some-engine',
  };

  beforeAll(() => {
    setMockValues(values);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getColumn = (index: number) => {
    const wrapper = shallow(<SuggestionsTable />);
    const table = wrapper.find(EuiBasicTable);
    const columns = table.prop('columns');
    return columns[index];
  };

  const renderColumn = (index: number) => {
    const column = getColumn(index);
    // @ts-ignore
    return (...props) => {
      // @ts-ignore
      return shallow(column.render(...props));
    };
  };

  it('renders', () => {
    const wrapper = shallow(<SuggestionsTable />);
    expect(wrapper.find(EuiBasicTable).exists()).toBe(true);
  });

  it('show a suggestions query with a link', () => {
    const wrapper = renderColumn(0)('test');
    expect(wrapper.prop('href')).toBe(
      '/app/enterprise_search/engines/some-engine/curations/suggestions/test'
    );
    expect(wrapper.text()).toEqual('test');
  });

  it('contains an updated at timestamp', () => {
    const wrapper = renderColumn(1)('2021-07-08T14:35:50Z');
    expect(wrapper.find('FormattedDate').exists()).toBe(true);
  });

  it('contains a promoted documents count', () => {
    const wrapper = renderColumn(2)(['a', 'b', 'c']);
    expect(wrapper.text()).toEqual('3');
  });

  it('has a view action', () => {
    const column = getColumn(3);
    // @ts-ignore
    const actions = column.actions;
    actions[0].onClick({
      query: 'foo',
    });
    expect(navigateToUrl).toHaveBeenCalledWith('/engines/some-engine/curations/suggestions/foo');
  });
});
