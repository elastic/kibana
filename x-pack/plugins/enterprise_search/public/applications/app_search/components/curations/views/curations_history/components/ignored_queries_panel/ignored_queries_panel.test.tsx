/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBasicTable } from '@elastic/eui';

import { DataPanel } from '../../../../../data_panel';

import { IgnoredQueriesPanel } from '../ignored_queries_panel';

describe('IgnoredQueriesPanel', () => {
  it('renders', () => {
    const wrapper = shallow(<IgnoredQueriesPanel />);

    expect(wrapper.is(DataPanel)).toBe(true);
    expect(wrapper.find(EuiBasicTable)).toHaveLength(1);
  });
});
