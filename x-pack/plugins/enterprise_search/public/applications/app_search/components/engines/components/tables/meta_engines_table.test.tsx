/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';
import '../../../../../__mocks__/enterprise_search_url.mock';
import './__mocks__/engines_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBasicTable } from '@elastic/eui';

import { mountWithIntl } from '../../../../../test_helpers';

import { EngineDetails } from '../../../engine/types';

import { MetaEnginesTable } from './meta_engines_table';
import { MetaEnginesTableExpandedRow } from './meta_engines_table_expanded_row';
import { MetaEnginesTableNameColumnContent } from './meta_engines_table_name_column_content';

import { runSharedColumnsTests, runSharedPropsTests } from './test_helpers';

describe('MetaEnginesTable', () => {
  const data = [
    {
      name: 'test-engine',
      created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
      isMeta: true,
      document_count: 99999,
      field_count: 10,
      includedEngines: [{ name: 'source-engine-1' }, { name: 'source-engine-2' }],
    } as EngineDetails,
  ];
  const props = {
    items: data,
    loading: false,
    pagination: {
      pageIndex: 0,
      pageSize: 10,
      totalItemCount: 1,
      showPerPageOptions: false,
    },
    onChange: () => {},
  };

  const DEFAULT_VALUES = {
    myRole: {
      canManageMetaEngines: false,
    },
    expandedSourceEngines: {},
    hideRow: jest.fn(),
    fetchOrDisplayRow: jest.fn(),
  };
  setMockValues(DEFAULT_VALUES);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<MetaEnginesTable {...props} />);
    expect(wrapper.find(EuiBasicTable)).toHaveLength(1);
  });

  describe('columns', () => {
    const wrapper = shallow(<MetaEnginesTable {...props} />);
    const tableContent = mountWithIntl(<MetaEnginesTable {...props} />)
      .find(EuiBasicTable)
      .text();
    runSharedColumnsTests(wrapper, tableContent, DEFAULT_VALUES);
  });

  describe('passed props', () => {
    const wrapper = shallow(<MetaEnginesTable {...props} />);
    runSharedPropsTests(wrapper);
  });

  describe('expanded source engines', () => {
    it('is hidden by default', () => {
      const wrapper = shallow(<MetaEnginesTable {...props} />);
      const table = wrapper.find(EuiBasicTable).dive();

      expect(table.find(MetaEnginesTableNameColumnContent)).toHaveLength(1);
      expect(table.find(MetaEnginesTableExpandedRow)).toHaveLength(0);
    });

    it('is visible when the row has been expanded', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        expandedSourceEngines: { 'test-engine': true },
      });
      const wrapper = shallow(<MetaEnginesTable {...props} />);
      const table = wrapper.find(EuiBasicTable);
      expect(table.dive().find(MetaEnginesTableExpandedRow)).toHaveLength(1);
    });
  });
});
