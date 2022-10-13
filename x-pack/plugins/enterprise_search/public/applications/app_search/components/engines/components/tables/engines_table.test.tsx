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

import { EnginesTable } from './engines_table';

import { runSharedColumnsTests, runSharedPropsTests } from './test_helpers';

describe('EnginesTable', () => {
  const data = [
    {
      name: 'test-engine',
      created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
      language: 'English',
      isMeta: false,
      document_count: 99999,
      field_count: 10,
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
  setMockValues({ myRole: { canManageEngines: false } });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<EnginesTable {...props} />);
    expect(wrapper.find(EuiBasicTable)).toHaveLength(1);
  });

  describe('columns', () => {
    const wrapper = shallow(<EnginesTable {...props} />);
    const tableContent = mountWithIntl(<EnginesTable {...props} />)
      .find(EuiBasicTable)
      .text();
    runSharedColumnsTests(wrapper, tableContent);
  });

  describe('language column', () => {
    it('renders language when set', () => {
      const wrapper = mountWithIntl(
        <EnginesTable {...props} items={[{ ...data[0], language: 'German' }]} />
      );
      expect(wrapper.find(EuiBasicTable).text()).toContain('German');
    });

    it('renders the language as Universal if no language is set', () => {
      const wrapper = mountWithIntl(
        <EnginesTable {...props} items={[{ ...data[0], language: null }]} />
      );
      expect(wrapper.find(EuiBasicTable).text()).toContain('Universal');
    });
  });

  describe('passed props', () => {
    const wrapper = shallow(<EnginesTable {...props} />);
    runSharedPropsTests(wrapper);
  });
});
