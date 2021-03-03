/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiEmptyPrompt } from '@elastic/eui';

import { Loading } from '../../../shared/loading';
import { RoleMappingsTable } from '../../../shared/role_mapping';
import { wsRoleMapping } from '../../../shared/role_mapping/__mocks__/roles';

import { RoleMappings } from './role_mappings';

describe('RoleMappings', () => {
  const initializeRoleMappings = jest.fn();
  const mockValues = {
    roleMappings: [wsRoleMapping],
    dataLoading: false,
    multipleAuthProvidersConfig: false,
  };

  beforeEach(() => {
    setMockActions({
      initializeRoleMappings,
    });
    setMockValues(mockValues);
  });

  it('renders', () => {
    const wrapper = shallow(<RoleMappings />);

    expect(wrapper.find(RoleMappingsTable)).toHaveLength(1);
  });

  it('returns Loading when loading', () => {
    setMockValues({ ...mockValues, dataLoading: true });
    const wrapper = shallow(<RoleMappings />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('renders empty state', () => {
    setMockValues({ ...mockValues, roleMappings: [] });
    const wrapper = shallow(<RoleMappings />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });
});
