/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';

import React from 'react';

import { ModalAllErrors } from './modal_all_errors';
import { AppToast } from '.';
import { cloneDeep } from 'lodash/fp';

const mockToast: AppToast = {
  color: 'danger',
  id: 'id-super-id',
  iconType: 'alert',
  title: 'Test & Test',
  errors: [
    'Error 1, Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  ],
};

describe('Modal all errors', () => {
  const toggle = jest.fn();
  describe('rendering', () => {
    test('it renders the default all errors modal when isShowing is positive', () => {
      const wrapper = shallow(
        <ModalAllErrors isShowing={true} toast={mockToast} toggle={toggle} />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('it renders null when isShowing is negative', () => {
      const wrapper = shallow(
        <ModalAllErrors isShowing={false} toast={mockToast} toggle={toggle} />
      );
      expect(wrapper.html()).toEqual(null);
    });

    test('it renders multiple errors in modal', () => {
      const mockToastWithTwoError = cloneDeep(mockToast);
      mockToastWithTwoError.errors = [
        'Error 1, Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
        'Error 2, Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
        'Error 3, Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      ];
      const wrapper = shallow(
        <ModalAllErrors isShowing={true} toast={mockToastWithTwoError} toggle={toggle} />
      );
      expect(wrapper.find('[data-test-subj="modal-all-errors-accordion"]').length).toBe(
        mockToastWithTwoError.errors.length
      );
    });
  });

  describe('events', () => {
    test('Make sure that toggle function has been called when you click on the close button', () => {
      const wrapper = shallow(
        <ModalAllErrors isShowing={true} toast={mockToast} toggle={toggle} />
      );

      wrapper.find('[data-test-subj="modal-all-errors-close"]').simulate('click');
      wrapper.update();
      expect(toggle).toHaveBeenCalledWith(mockToast);
    });
  });
});
