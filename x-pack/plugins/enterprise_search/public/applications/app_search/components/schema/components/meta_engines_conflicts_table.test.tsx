/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { mount } from 'enzyme';

import { EuiTable, EuiTableHeaderCell, EuiTableRow } from '@elastic/eui';

import { MetaEnginesConflictsTable } from '.';

describe('MetaEnginesConflictsTable', () => {
  const values = {
    conflictingFields: {
      hello_field: {
        text: ['engine1'],
        number: ['engine2'],
        date: ['engine3'],
      },
      world_field: {
        text: ['engine1'],
        location: ['engine2', 'engine3', 'engine4'],
      },
    },
  };

  setMockValues(values);
  const wrapper = mount(<MetaEnginesConflictsTable />);
  const fieldNames = wrapper.find('EuiTableRowCell[data-test-subj="fieldName"]');
  const fieldTypes = wrapper.find('EuiTableRowCell[data-test-subj="fieldTypes"]');
  const engines = wrapper.find('EuiTableRowCell[data-test-subj="enginesPerFieldType"]');

  it('renders', () => {
    expect(wrapper.find(EuiTable)).toHaveLength(1);
    expect(wrapper.find(EuiTableHeaderCell).at(0).text()).toEqual('Field name');
    expect(wrapper.find(EuiTableHeaderCell).at(1).text()).toEqual('Field type conflicts');
    expect(wrapper.find(EuiTableHeaderCell).at(2).text()).toEqual('Engines');
  });

  it('renders a rowspan on the initial field name column so that it stretches to all associated field conflict rows', () => {
    expect(fieldNames).toHaveLength(2);
    expect(fieldNames.at(0).prop('rowSpan')).toEqual(3);
    expect(fieldNames.at(1).prop('rowSpan')).toEqual(2);
  });

  it('renders a row for each field type conflict and the engines that have that field type', () => {
    expect(wrapper.find(EuiTableRow)).toHaveLength(5);

    expect(fieldNames.at(0).text()).toEqual('hello_field');
    expect(fieldTypes.at(0).text()).toEqual('text');
    expect(engines.at(0).text()).toEqual('engine1');
    expect(fieldTypes.at(1).text()).toEqual('number');
    expect(engines.at(1).text()).toEqual('engine2');
    expect(fieldTypes.at(2).text()).toEqual('date');
    expect(engines.at(2).text()).toEqual('engine3');

    expect(fieldNames.at(1).text()).toEqual('world_field');
    expect(fieldTypes.at(3).text()).toEqual('text');
    expect(engines.at(3).text()).toEqual('engine1');
    expect(fieldTypes.at(4).text()).toEqual('location');
    expect(engines.at(4).text()).toEqual('engine2, engine3, +1');
  });
});
