/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wsRoleMapping, asRoleMapping } from './__mocks__/roles';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFieldSearch, EuiTableRow } from '@elastic/eui';

import { ALL_LABEL, ANY_AUTH_PROVIDER_OPTION_LABEL } from './constants';

import { RoleMappingsTable } from './role_mappings_table';

describe('RoleMappingsTable', () => {
  const initializeRoleMapping = jest.fn();
  const handleDeleteMapping = jest.fn();
  const roleMappings = [
    {
      ...wsRoleMapping,
      accessItems: [
        {
          name: 'foo',
        },
      ],
    },
  ];

  const props = {
    accessItemKey: 'groups' as 'groups' | 'engines',
    accessHeader: 'access',
    roleMappings,
    addMappingButton: <button />,
    shouldShowAuthProvider: true,
    initializeRoleMapping,
    handleDeleteMapping,
  };

  it('renders', () => {
    const wrapper = shallow(<RoleMappingsTable {...props} />);

    expect(wrapper.find(EuiFieldSearch)).toHaveLength(1);
    expect(wrapper.find(EuiTableRow)).toHaveLength(1);
  });

  it('renders auth provider display names', () => {
    const wrapper = shallow(<RoleMappingsTable {...props} />);

    expect(wrapper.find('[data-test-subj="AuthProviderDisplay"]').prop('children')).toEqual(
      `${ANY_AUTH_PROVIDER_OPTION_LABEL}, other_auth`
    );
  });

  it('handles input change', () => {
    const wrapper = shallow(<RoleMappingsTable {...props} />);
    const input = wrapper.find(EuiFieldSearch);
    const value = 'Query';
    input.simulate('change', { target: { value } });

    expect(wrapper.find(EuiTableRow)).toHaveLength(0);
  });

  it('handles manage click', () => {
    const wrapper = shallow(<RoleMappingsTable {...props} />);
    wrapper.find('[data-test-subj="ManageButton"]').simulate('click');

    expect(initializeRoleMapping).toHaveBeenCalled();
  });

  it('handles delete click', () => {
    const wrapper = shallow(<RoleMappingsTable {...props} />);
    wrapper.find('[data-test-subj="DeleteButton"]').simulate('click');

    expect(handleDeleteMapping).toHaveBeenCalled();
  });

  it('handles input change with special chars', () => {
    const wrapper = shallow(<RoleMappingsTable {...props} />);
    const input = wrapper.find(EuiFieldSearch);
    const value = '*//username';
    input.simulate('change', { target: { value } });

    expect(wrapper.find(EuiTableRow)).toHaveLength(1);
  });

  it('shows default message when "accessAllEngines" is true', () => {
    const wrapper = shallow(
      <RoleMappingsTable {...props} roleMappings={[asRoleMapping as any]} accessItemKey="engines" />
    );

    expect(wrapper.find('[data-test-subj="AccessItemsList"]').prop('children')).toEqual(ALL_LABEL);
  });

  it('handles display when no items present', () => {
    const noItemsRoleMapping = { ...asRoleMapping, engines: [] };
    noItemsRoleMapping.accessAllEngines = false;

    const wrapper = shallow(
      <RoleMappingsTable
        {...props}
        roleMappings={[noItemsRoleMapping as any]}
        accessItemKey="engines"
      />
    );

    expect(wrapper.find('[data-test-subj="AccessItemsList"]').children().children().text()).toEqual(
      '—'
    );
  });
});
