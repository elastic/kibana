/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiTable, EuiTableHeaderCell, EuiTableRow, EuiHealth } from '@elastic/eui';

import { SchemaFieldTypeSelect } from '../../../../shared/schema';

import { SchemaTable } from '.';

describe('SchemaTable', () => {
  const values = {
    schema: {},
    unconfirmedFields: [],
    myRole: { canManageEngines: true },
  };
  const actions = {
    updateSchemaFieldType: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<SchemaTable />);

    expect(wrapper.find(EuiTable)).toHaveLength(1);
    expect(wrapper.find(EuiTableHeaderCell).first().prop('children')).toEqual('Field name');
    expect(wrapper.find(EuiTableHeaderCell).last().prop('children')).toEqual('Field type');
  });

  it('always renders an initial ID row (with no field type select)', () => {
    const wrapper = shallow(<SchemaTable />);

    expect(wrapper.find(EuiTableRow)).toHaveLength(1);
    expect(wrapper.find('code').text()).toEqual('id');
    expect(wrapper.find(SchemaFieldTypeSelect)).toHaveLength(0);
  });

  it('renders subsequent table rows for each schema field', () => {
    setMockValues({
      ...values,
      schema: {
        some_text_field: 'text',
        some_number_field: 'number',
        some_date_field: 'date',
        some_location_field: 'geolocation',
      },
    });
    const wrapper = shallow(<SchemaTable />);

    expect(wrapper.find(EuiTableRow)).toHaveLength(5);

    expect(wrapper.find('code').at(1).text()).toEqual('some_text_field');
    expect(wrapper.find(SchemaFieldTypeSelect).at(0).prop('fieldType')).toEqual('text');

    expect(wrapper.find('code').last().text()).toEqual('some_location_field');
    expect(wrapper.find(SchemaFieldTypeSelect).last().prop('fieldType')).toEqual('geolocation');
  });

  it('renders a recently added status if a field has been recently added', () => {
    setMockValues({
      ...values,
      schema: {
        some_new_field: 'text',
      },
      unconfirmedFields: ['some_new_field'],
    });
    const wrapper = shallow(<SchemaTable />);

    expect(wrapper.find(EuiHealth)).toHaveLength(1);
    expect(wrapper.find(EuiHealth).childAt(0).prop('children')).toEqual('Recently added');
  });

  it('disables table actions if access disallowed', () => {
    setMockValues({
      ...values,
      schema: {
        some_text_field: 'text',
      },
      myRole: { canManageEngines: false },
    });
    const wrapper = shallow(<SchemaTable />);

    expect(wrapper.find(SchemaFieldTypeSelect).at(0).prop('disabled')).toEqual(true);
  });
});
