/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import { findTestSubject } from 'test_utils/find_test_subject';
import { CopyModeControl, CopyModeControlProps } from './copy_mode_control';

describe('CopyModeControl', () => {
  const initialValues = { createNewCopies: false, overwrite: true }; // some test cases below make assumptions based on these initial values
  const updateSelection = jest.fn();

  const getOverwriteSwitch = (wrapper: ReactWrapper) =>
    findTestSubject(wrapper, 'cts-copy-mode-overwrite-switch');
  const getRadio = (wrapper: ReactWrapper) => findTestSubject(wrapper, 'cts-copy-mode-radio');
  const getRadioDisabledOption = (wrapper: ReactWrapper) =>
    getRadio(wrapper).find('input[id="createNewCopiesDisabled"]');
  const getRadioEnabledOption = (wrapper: ReactWrapper) =>
    getRadio(wrapper).find('input[id="createNewCopiesEnabled"]');

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const props: CopyModeControlProps = { initialValues, updateSelection };

  it('should render as expected', async () => {
    const wrapper = shallowWithIntl(<CopyModeControl {...props} />);

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiRadioGroup
        data-test-subj="cts-copy-mode-radio"
        idSelected="createNewCopiesDisabled"
        onChange={[Function]}
        options={
          Array [
            Object {
              "id": "createNewCopiesDisabled",
              "label": <React.Fragment>
                <React.Fragment>
                  <EuiText>
                    Check for conflicts
                  </EuiText>
                  <EuiSpacer
                    size="xs"
                  />
                  <EuiText
                    color="subdued"
                  >
                    Check each copied object for similar origin IDs in the destination space
                  </EuiText>
                </React.Fragment>
                <EuiSpacer
                  size="xs"
                />
                <EuiSwitch
                  checked={true}
                  compressed={true}
                  data-test-subj="cts-copy-mode-overwrite-switch"
                  disabled={false}
                  label="Automatically try to overwrite conflicts?"
                  onChange={[Function]}
                />
                <EuiSpacer
                  size="m"
                />
              </React.Fragment>,
            },
            Object {
              "id": "createNewCopiesEnabled",
              "label": <React.Fragment>
                <EuiText>
                  Add as copies
                </EuiText>
                <EuiSpacer
                  size="xs"
                />
                <EuiText
                  color="subdued"
                >
                  All copied objects will be created with new random IDs
                </EuiText>
              </React.Fragment>,
            },
          ]
        }
      />
    `);
  });

  it('should allow the user to toggle `overwrite`', async () => {
    const wrapper = mountWithIntl(<CopyModeControl {...props} />);

    expect(updateSelection).not.toHaveBeenCalled();
    const { createNewCopies } = initialValues;

    getOverwriteSwitch(wrapper).simulate('click');
    expect(updateSelection).toHaveBeenNthCalledWith(1, { createNewCopies, overwrite: false });

    getOverwriteSwitch(wrapper).simulate('click');
    expect(updateSelection).toHaveBeenNthCalledWith(2, { createNewCopies, overwrite: true });
  });

  it('should disable the Overwrite switch when `createNewCopies` is enabled', async () => {
    const wrapper = mountWithIntl(<CopyModeControl {...props} />);

    expect(getOverwriteSwitch(wrapper).prop('disabled')).toBe(false);
    getRadioEnabledOption(wrapper).simulate('change');
    expect(getOverwriteSwitch(wrapper).prop('disabled')).toBe(true);
  });

  it('should allow the user to toggle `createNewCopies`', async () => {
    const wrapper = mountWithIntl(<CopyModeControl {...props} />);

    expect(updateSelection).not.toHaveBeenCalled();
    const { overwrite } = initialValues;

    getRadioEnabledOption(wrapper).simulate('change');
    expect(updateSelection).toHaveBeenNthCalledWith(1, { createNewCopies: true, overwrite });

    getRadioDisabledOption(wrapper).simulate('change');
    expect(updateSelection).toHaveBeenNthCalledWith(2, { createNewCopies: false, overwrite });
  });
});
