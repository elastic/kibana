/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__';

import React, { MouseEvent } from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiEmptyPrompt, EuiConfirmModal, EuiPageHeader } from '@elastic/eui';

import { Loading } from '../../../shared/loading';
import { RoleMappingsTable } from '../../../shared/role_mapping';
import { wsRoleMapping } from '../../../shared/role_mapping/__mocks__/roles';

import { RoleMappings } from './role_mappings';

describe('RoleMappings', () => {
  const initializeRoleMappings = jest.fn();
  const handleResetMappings = jest.fn();
  const mockValues = {
    roleMappings: [wsRoleMapping],
    dataLoading: false,
    multipleAuthProvidersConfig: false,
  };

  beforeEach(() => {
    setMockActions({
      initializeRoleMappings,
      handleResetMappings,
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

  describe('resetMappingsWarningModal', () => {
    let wrapper: ShallowWrapper;

    beforeEach(() => {
      wrapper = shallow(<RoleMappings />);
      const button = wrapper.find(EuiPageHeader).prop('rightSideItems')![0] as any;
      button.props.onClick();
    });

    it('renders reset warnings modal', () => {
      expect(wrapper.find(EuiConfirmModal)).toHaveLength(1);
    });

    it('hides reset warnings modal', () => {
      const modal = wrapper.find(EuiConfirmModal);
      modal.prop('onCancel')();

      expect(wrapper.find(EuiConfirmModal)).toHaveLength(0);
    });

    it('resets when confirmed', () => {
      const event = {} as MouseEvent<HTMLButtonElement>;
      const modal = wrapper.find(EuiConfirmModal);
      modal.prop('onConfirm')!(event);

      expect(handleResetMappings).toHaveBeenCalled();
    });
  });
});
