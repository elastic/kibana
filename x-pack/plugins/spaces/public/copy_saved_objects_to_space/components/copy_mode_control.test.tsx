/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactWrapper } from 'enzyme';
import React from 'react';

import { mountWithIntl } from '@kbn/test-jest-helpers';

import type { CopyModeControlProps } from './copy_mode_control';
import { CopyModeControl } from './copy_mode_control';

describe('CopyModeControl', () => {
  const initialValues = { createNewCopies: true, overwrite: true }; // some test cases below make assumptions based on these initial values
  const updateSelection = jest.fn();

  const getOverwriteRadio = (wrapper: ReactWrapper) =>
    wrapper.find('EuiRadioGroup[data-test-subj="cts-copyModeControl-overwriteRadioGroup"]');
  const getOverwriteEnabled = (wrapper: ReactWrapper) =>
    wrapper.find('input[id="overwriteEnabled"]');
  const getOverwriteDisabled = (wrapper: ReactWrapper) =>
    wrapper.find('input[id="overwriteDisabled"]');
  const getCreateNewCopiesDisabled = (wrapper: ReactWrapper) =>
    wrapper.find('input[id="createNewCopiesDisabled"]');
  const getCreateNewCopiesEnabled = (wrapper: ReactWrapper) =>
    wrapper.find('input[id="createNewCopiesEnabled"]');

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const props: CopyModeControlProps = { initialValues, updateSelection };

  it('should allow the user to toggle `overwrite`', async () => {
    const wrapper = mountWithIntl(<CopyModeControl {...props} />);

    expect(updateSelection).not.toHaveBeenCalled();
    // need to disable `createNewCopies` first
    getCreateNewCopiesDisabled(wrapper).simulate('change');
    const createNewCopies = false;

    getOverwriteDisabled(wrapper).simulate('change');
    expect(updateSelection).toHaveBeenNthCalledWith(2, { createNewCopies, overwrite: false });

    getOverwriteEnabled(wrapper).simulate('change');
    expect(updateSelection).toHaveBeenNthCalledWith(3, { createNewCopies, overwrite: true });
  });

  it('should enable the Overwrite switch when `createNewCopies` is disabled', async () => {
    const wrapper = mountWithIntl(<CopyModeControl {...props} />);

    expect(getOverwriteRadio(wrapper).prop('disabled')).toBe(true);
    getCreateNewCopiesDisabled(wrapper).simulate('change');
    expect(getOverwriteRadio(wrapper).prop('disabled')).toBe(false);
  });

  it('should allow the user to toggle `createNewCopies`', async () => {
    const wrapper = mountWithIntl(<CopyModeControl {...props} />);

    expect(updateSelection).not.toHaveBeenCalled();
    const { overwrite } = initialValues;

    getCreateNewCopiesDisabled(wrapper).simulate('change');
    expect(updateSelection).toHaveBeenNthCalledWith(1, { createNewCopies: false, overwrite });

    getCreateNewCopiesEnabled(wrapper).simulate('change');
    expect(updateSelection).toHaveBeenNthCalledWith(2, { createNewCopies: true, overwrite });
  });
});
