/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { SecurityNavControl } from './nav_control_component';
import { AuthenticatedUser } from '../../common/model';
import { EuiPopover } from '@elastic/eui';

describe('SecurityNavControl', () => {
  it(`renders a loading spinner when the user promise hasn't resolved yet.`, async () => {
    const props = {
      user: new Promise(() => {}) as Promise<AuthenticatedUser>,
      editProfileUrl: '',
      logoutUrl: '',
    };

    const wrapper = shallowWithIntl(<SecurityNavControl {...props} />);
    const { button } = wrapper.find(EuiPopover).props();
    expect(button).toMatchInlineSnapshot(`
      <EuiHeaderSectionItemButton
        aria-controls="headerUserMenu"
        aria-expanded={false}
        aria-haspopup="true"
        aria-label="Account menu"
        data-test-subj="userMenuButton"
        onClick={[Function]}
      >
        <EuiLoadingSpinner
          size="m"
        />
      </EuiHeaderSectionItemButton>
    `);
  });

  it(`renders an avatar after the user promise resolves.`, async () => {
    const props = {
      user: Promise.resolve({ full_name: 'foo' }) as Promise<AuthenticatedUser>,
      editProfileUrl: '',
      logoutUrl: '',
    };

    const wrapper = shallowWithIntl(<SecurityNavControl {...props} />);
    await Promise.resolve();
    wrapper.update();
    const { button } = wrapper.find(EuiPopover).props();
    expect(button).toMatchInlineSnapshot(`
      <EuiHeaderSectionItemButton
        aria-controls="headerUserMenu"
        aria-expanded={false}
        aria-haspopup="true"
        aria-label="Account menu"
        data-test-subj="userMenuButton"
        onClick={[Function]}
      >
        <EuiAvatar
          name="foo"
          size="s"
        />
      </EuiHeaderSectionItemButton>
    `);
  });
});
