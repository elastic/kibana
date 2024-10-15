/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../__mocks__/shallow_useeffect.mock';

import { setMockValues } from '../../__mocks__/kea_logic';

import React from 'react';

import { mount, shallow } from 'enzyme';

import { EuiButton, EuiLink, EuiEmptyPrompt } from '@elastic/eui';
import { IntlProvider } from '@kbn/i18n-react';

import { RolesEmptyPrompt } from './roles_empty_prompt';

describe('RolesEmptyPrompt', () => {
  const onEnable = jest.fn();

  const props = {
    productName: 'App Search',
    docsLink: 'http://elastic.co',
    onEnable,
  };

  const mockUser = {
    username: 'elastic',
    roles: ['superuser'],
  };

  beforeAll(() => {});

  it('gets the current user on mount', () => {
    shallow(<RolesEmptyPrompt {...props} />);
  });

  it('does not render if there is no user', async () => {
    const wrapper = await shallow(<RolesEmptyPrompt {...props} />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('renders', async () => {
    setMockValues({ user: mockUser });
    const wrapper = await shallow(<RolesEmptyPrompt {...props} />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(wrapper.find(EuiEmptyPrompt).dive().find(EuiLink).prop('href')).toEqual(props.docsLink);
  });

  it('disables button when non-superuser', async () => {
    setMockValues({
      user: {
        username: 'user',
        roles: ['foo'],
      },
    });
    const wrapper = await shallow(<RolesEmptyPrompt {...props} />);

    expect(wrapper.find(EuiEmptyPrompt).dive().find(EuiButton).prop('disabled')).toBe(true);
    expect(
      wrapper.find(EuiEmptyPrompt).dive().find('[data-test-subj="rbacDisabledLabel"]')
    ).toHaveLength(1);
  });

  it('calls onEnable on change', async () => {
    setMockValues({ user: mockUser });
    const wrapper = await shallow(<RolesEmptyPrompt {...props} />);
    const prompt = wrapper.find(EuiEmptyPrompt).dive();
    prompt.find(EuiButton).simulate('click');

    expect(onEnable).toHaveBeenCalled();
  });

  describe('deprecation callout', () => {
    it('renders the deprecation callout when user can manage engines', () => {
      const wrapper = shallow(<RolesEmptyPrompt {...props} />);
      expect(wrapper.find('EnterpriseSearchDeprecationCallout')).toHaveLength(1);
    });

    it('renders the deprecation callout when user cannot manage engines', () => {
      const wrapper = shallow(<RolesEmptyPrompt {...props} />);
      expect(wrapper.find('EnterpriseSearchDeprecationCallout')).toHaveLength(1);
    });

    it('dismisses the deprecation callout', () => {
      const wrapper = mount(
        <IntlProvider locale="en">
          <RolesEmptyPrompt {...props} />
        </IntlProvider>
      );

      sessionStorage.setItem('appSearchHideDeprecationCallout', 'false');
      expect(wrapper.find('EnterpriseSearchDeprecationCallout')).toHaveLength(1);

      wrapper.find('button[data-test-subj="euiDismissCalloutButton"]').simulate('click');
      expect(wrapper.find('EnterpriseSearchDeprecationCallout')).toHaveLength(0);
      expect(sessionStorage.getItem('appSearchHideDeprecationCallout')).toEqual('true');
    });

    it('does not render the deprecation callout if dismissed', () => {
      sessionStorage.setItem('appSearchHideDeprecationCallout', 'true');
      const wrapper = shallow(<RolesEmptyPrompt {...props} />);
      expect(wrapper.find('EnterpriseSearchDeprecationCallout')).toHaveLength(0);
    });
  });
});
