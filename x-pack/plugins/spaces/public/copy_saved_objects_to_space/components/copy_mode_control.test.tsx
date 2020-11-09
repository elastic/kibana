/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { CopyModeControl, CopyModeControlProps } from './copy_mode_control';

describe('CopyModeControl', () => {
  const initialValues = { createNewCopies: false, overwrite: true }; // some test cases below make assumptions based on these initial values
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
    const { createNewCopies } = initialValues;

    getOverwriteDisabled(wrapper).simulate('change');
    expect(updateSelection).toHaveBeenNthCalledWith(1, { createNewCopies, overwrite: false });

    getOverwriteEnabled(wrapper).simulate('change');
    expect(updateSelection).toHaveBeenNthCalledWith(2, { createNewCopies, overwrite: true });
  });

  it('should disable the Overwrite switch when `createNewCopies` is enabled', async () => {
    const wrapper = mountWithIntl(<CopyModeControl {...props} />);

    expect(getOverwriteRadio(wrapper).prop('disabled')).toBe(false);
    getCreateNewCopiesEnabled(wrapper).simulate('change');
    expect(getOverwriteRadio(wrapper).prop('disabled')).toBe(true);
  });

  it('should allow the user to toggle `createNewCopies`', async () => {
    const wrapper = mountWithIntl(<CopyModeControl {...props} />);

    expect(updateSelection).not.toHaveBeenCalled();
    const { overwrite } = initialValues;

    getCreateNewCopiesEnabled(wrapper).simulate('change');
    expect(updateSelection).toHaveBeenNthCalledWith(1, { createNewCopies: true, overwrite });

    getCreateNewCopiesDisabled(wrapper).simulate('change');
    expect(updateSelection).toHaveBeenNthCalledWith(2, { createNewCopies: false, overwrite });
  });
});
