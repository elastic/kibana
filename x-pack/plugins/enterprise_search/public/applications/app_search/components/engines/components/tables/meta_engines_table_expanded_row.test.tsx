/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBasicTable, EuiHealth } from '@elastic/eui';

import { mountWithIntl } from '../../../../../test_helpers';

import { EngineDetails } from '../../../engine/types';

import { MetaEnginesTableExpandedRow } from './meta_engines_table_expanded_row';

const SOURCE_ENGINES = [
  {
    name: 'source-engine-1',
    created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
    language: 'English',
    isMeta: true,
    document_count: 99999,
    field_count: 10,
  },
  {
    name: 'source-engine-2',
    created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
    language: 'English',
    isMeta: true,
    document_count: 55555,
    field_count: 7,
  },
] as EngineDetails[];

describe('MetaEnginesTableExpandedRow', () => {
  it('contains relevant source engine information', () => {
    const wrapper = mountWithIntl(
      <MetaEnginesTableExpandedRow sourceEngines={SOURCE_ENGINES} conflictingEngines={new Set()} />
    );
    const table = wrapper.find(EuiBasicTable);

    expect(table).toHaveLength(1);

    const tableContent = table.text();
    expect(tableContent).toContain('source-engine-1');
    expect(tableContent).toContain('99,999');
    expect(tableContent).toContain('10');

    expect(tableContent).toContain('source-engine-2');
    expect(tableContent).toContain('55,555');
    expect(tableContent).toContain('7');
  });

  it('indicates when a meta-engine has conflicts', () => {
    const wrapper = shallow(
      <MetaEnginesTableExpandedRow
        sourceEngines={SOURCE_ENGINES}
        conflictingEngines={new Set(['source-engine-1', 'source-engine-2'])}
      />
    );
    const table = wrapper.find(EuiBasicTable).dive();
    // @ts-expect-error upgrade typescript v5.1.6
    const tableBody = table.find('RenderWithEuiTheme').renderProp('children')();

    expect(tableBody.find(EuiHealth)).toHaveLength(2);
  });
});
