/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBasicTable, EuiHealth } from '@elastic/eui';

import { EngineDetails } from '../../engine/types';

import { MetaEnginesTableExpandedRow } from './meta_engines_table_expanded_row';

const SOURCE_ENGINES = [
  {
    name: 'test-engine',
    created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
    language: 'English',
    isMeta: true,
    document_count: 99999,
    field_count: 10,
  } as EngineDetails,
];

describe('MetaEnginesTableExpandedRow', () => {
  describe('contains relevant source engine information', () => {
    const wrapper = shallow(
      <MetaEnginesTableExpandedRow sourceEngines={SOURCE_ENGINES} conflictingEngines={new Set()} />
    );
    const table = wrapper.find(EuiBasicTable);

    expect(table).toHaveLength(1);

    const tableContent = table.text();
    expect(tableContent).toContain('test-engine');
    expect(tableContent).toContain('99,999');
    expect(tableContent).toContain('10');
  });

  describe('indicates when a meta-engine has conflicts', () => {
    const wrapper = shallow(
      <MetaEnginesTableExpandedRow sourceEngines={SOURCE_ENGINES} conflictingEngines={new Set()} />
    );

    expect(wrapper.find(EuiHealth)).toHaveLength(1);
  });
});
