/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { mockKibanaValues, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { AccountSettings } from '.';

describe('AccountSettings', () => {
  const {
    security: {
      uiApi: {
        components: { getPersonalInfo, getChangePassword },
      },
    },
  } = mockKibanaValues;

  it('does not render if the current user does not exist', async () => {
    const wrapper = await shallow(<AccountSettings />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('renders the security UI components when the user exists', async () => {
    setMockValues({ user: { username: 'mock user' } });
    (getPersonalInfo as jest.Mock).mockReturnValue(<div data-test-subj="PersonalInfo" />);
    (getChangePassword as jest.Mock).mockReturnValue(<div data-test-subj="ChangePassword" />);

    const wrapper = await shallow(<AccountSettings />);

    expect(wrapper.childAt(0).dive().find('[data-test-subj="PersonalInfo"]')).toHaveLength(1);
    expect(wrapper.childAt(1).dive().find('[data-test-subj="ChangePassword"]')).toHaveLength(1);
  });
});
