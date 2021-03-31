/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButton, EuiModal } from '@elastic/eui';

import { CurationQueries } from '../../components';

import { ManageQueriesModal } from './';

describe('ManageQueriesModal', () => {
  const values = {
    queries: ['hello', 'world'],
    queriesLoading: false,
  };

  const actions = {
    updateQueries: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  describe('modal button', () => {
    it('renders a modal toggle button', () => {
      const wrapper = shallow(<ManageQueriesModal />);

      expect(wrapper.find(EuiButton)).toHaveLength(1);
      expect(wrapper.find(EuiButton).prop('onClick')).toBeTruthy();
    });

    it('renders the toggle button with a loading state when queriesLoading is true', () => {
      setMockValues({ ...values, queriesLoading: true });
      const wrapper = shallow(<ManageQueriesModal />);

      expect(wrapper.find(EuiButton).prop('isLoading')).toBe(true);
    });
  });

  describe('modal', () => {
    let wrapper: ShallowWrapper;

    beforeEach(() => {
      wrapper = shallow(<ManageQueriesModal />);
      wrapper.find(EuiButton).simulate('click');
    });

    it('renders the modal when the toggle button has been clicked', () => {
      expect(wrapper.find(EuiModal)).toHaveLength(1);
    });

    it('closes the modal', () => {
      wrapper.find(EuiModal).simulate('close');
      expect(wrapper.find(EuiModal)).toHaveLength(0);
    });

    it('renders the CurationQueries form component', () => {
      expect(wrapper.find(CurationQueries)).toHaveLength(1);
      expect(wrapper.find(CurationQueries).prop('queries')).toEqual(['hello', 'world']);
    });

    it('calls updateCuration and closes the modal on CurationQueries form submit', () => {
      wrapper.find(CurationQueries).simulate('submit', ['new', 'queries']);

      expect(actions.updateQueries).toHaveBeenCalledWith(['new', 'queries']);
      expect(wrapper.find(EuiModal)).toHaveLength(0);
    });
  });
});
