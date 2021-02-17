/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { AttributeSelector } from './attribute_selector';

const baseProps = {
  attributeName: 'An Attribute',
  attributeValue: 'Something',
  attributes: ['a', 'b', 'c'],
  availableAuthProviders: ['ees_saml', 'kbn_saml'],
  selectedAuthProviders: ['ees_saml'],
  elasticsearchRoles: ['whatever'],
  multipleAuthProvidersConfig: true,
  disabled: false,
  handleAttributeSelectorChange: () => {},
  handleAttributeValueChange: () => {},
  handleAuthProviderChange: () => {},
};

describe('<AttributeSelector />', () => {
  it('renders', () => {
    const wrapper = shallow(<AttributeSelector {...baseProps} />);
    expect(wrapper.find('[data-test-subj="attributeSelector"]')).toBeDefined();
  });

  describe('Auth Providers', () => {
    const findAuthProvidersSelect = (wrapper: ShallowWrapper) =>
      wrapper.find('[data-test-subj="authProviderSelect"]');

    it('will not render if "availableAuthProviders" prop has not been provided', () => {
      const wrapper = shallow(
        <AttributeSelector {...baseProps} availableAuthProviders={undefined} />
      );
      expect(wrapper.find('[data-test-subj="authProviderSelect"]')).toBeUndefined();
    });

    it('renders a list of auth providers from the "availableAuthProviders" prop including an "Any" option', () => {
      const wrapper = shallow(
        <AttributeSelector {...baseProps} availableAuthProviders={['ees_saml', 'kbn_saml']} />
      );

      const select = findAuthProvidersSelect(wrapper) as any;
      expect(select.props().options).toEqual([
        {
          label: expect.any(String),
          options: [{ label: 'Any', value: '*' }],
        },
        {
          label: expect.any(String),
          options: [
            { label: 'ees_saml', value: 'ees_saml' },
            { label: 'kbn_saml', value: 'kbn_saml' },
          ],
        },
      ]);
    });

    it('the "selectedAuthProviders" prop should be used as the selected value', () => {
      const wrapper = shallow(
        <AttributeSelector
          {...baseProps}
          availableAuthProviders={['ees_saml', 'kbn_saml']}
          selectedAuthProviders={['kbn_saml']}
        />
      );

      const select = findAuthProvidersSelect(wrapper) as any;
      expect(select.props().selectedOptions).toEqual([{ label: 'kbn_saml', value: 'kbn_saml' }]);
    });

    it('should call the "handleAuthProviderChange" prop when a value is selected', () => {
      const handleAuthProviderChangeMock = jest.fn();
      const wrapper = shallow(
        <AttributeSelector {...baseProps} handleAuthProviderChange={handleAuthProviderChangeMock} />
      );

      const select = findAuthProvidersSelect(wrapper);
      select.simulate('change', [{ label: 'kbn_saml', value: 'kbn_saml' }]);
      expect(handleAuthProviderChangeMock).toHaveBeenCalledWith(['kbn_saml']);
    });
  });
});
