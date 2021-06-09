/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiComboBox, EuiFieldText } from '@elastic/eui';

import { AttributeName } from '../types';

import { AttributeSelector } from './attribute_selector';
import { ANY_AUTH_PROVIDER, ANY_AUTH_PROVIDER_OPTION_LABEL } from './constants';

const handleAttributeSelectorChange = jest.fn();
const handleAttributeValueChange = jest.fn();
const handleAuthProviderChange = jest.fn();

const baseProps = {
  attributeName: 'username' as AttributeName,
  attributeValue: 'Something',
  attributeValueInvalid: false,
  attributes: ['a', 'b', 'c'],
  availableAuthProviders: ['ees_saml', 'kbn_saml'],
  selectedAuthProviders: ['ees_saml'],
  elasticsearchRoles: ['whatever'],
  multipleAuthProvidersConfig: true,
  disabled: false,
  handleAttributeSelectorChange,
  handleAttributeValueChange,
  handleAuthProviderChange,
};

describe('AttributeSelector', () => {
  it('renders', () => {
    const wrapper = shallow(<AttributeSelector {...baseProps} />);

    expect(wrapper.find('[data-test-subj="AttributeSelector"]').exists()).toBe(true);
  });

  describe('Auth Providers', () => {
    const findAuthProvidersSelect = (wrapper: ShallowWrapper) =>
      wrapper.find('[data-test-subj="AuthProviderSelect"]');

    it('will not render if "availableAuthProviders" prop has not been provided', () => {
      const wrapper = shallow(
        <AttributeSelector {...baseProps} availableAuthProviders={undefined} />
      );

      expect(findAuthProvidersSelect(wrapper)).toHaveLength(0);
    });

    it('handles fallback props', () => {
      const wrapper = shallow(
        <AttributeSelector
          {...baseProps}
          attributeValue={undefined}
          selectedAuthProviders={undefined}
        />
      );

      const select: ShallowWrapper = findAuthProvidersSelect(wrapper);

      expect(select.prop('selectedOptions')).toEqual([
        {
          label: ANY_AUTH_PROVIDER_OPTION_LABEL,
          value: ANY_AUTH_PROVIDER,
        },
      ]);
    });

    it('renders a list of auth providers from the "availableAuthProviders" prop including an "Any" option', () => {
      const wrapper = shallow(
        <AttributeSelector {...baseProps} availableAuthProviders={['ees_saml', 'kbn_saml']} />
      );
      const select = findAuthProvidersSelect(wrapper) as any;

      expect(select.props().options).toEqual([
        {
          label: expect.any(String),
          options: [{ label: ANY_AUTH_PROVIDER_OPTION_LABEL, value: '*' }],
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
      const wrapper = shallow(<AttributeSelector {...baseProps} />);
      const select = findAuthProvidersSelect(wrapper);
      select.simulate('change', [{ label: 'kbn_saml', value: 'kbn_saml' }]);

      expect(handleAuthProviderChange).toHaveBeenCalledWith(['kbn_saml']);
    });

    it('should call the "handleAuthProviderChange" prop with fallback when a value not present', () => {
      const wrapper = shallow(<AttributeSelector {...baseProps} />);
      const select = findAuthProvidersSelect(wrapper);
      select.simulate('change', [{ label: 'kbn_saml' }]);

      expect(handleAuthProviderChange).toHaveBeenCalledWith(['']);
    });

    it('should call the "handleAttributeSelectorChange" prop when a value is selected', () => {
      const wrapper = shallow(<AttributeSelector {...baseProps} />);
      const select = wrapper.find('[data-test-subj="ExternalAttributeSelect"]');
      const event = { target: { value: 'kbn_saml' } };
      select.simulate('change', event);

      expect(handleAttributeSelectorChange).toHaveBeenCalledWith(
        'kbn_saml',
        baseProps.elasticsearchRoles[0]
      );
    });

    it('handles fallback when no "handleAuthProviderChange" provided', () => {
      const wrapper = shallow(
        <AttributeSelector {...baseProps} handleAuthProviderChange={undefined} />
      );

      expect(wrapper.find(EuiComboBox).prop('onChange')!([])).toEqual(undefined);
    });

    it('should call the "handleAttributeSelectorChange" prop when field text value is changed', () => {
      const wrapper = shallow(<AttributeSelector {...baseProps} />);
      const input = wrapper.find(EuiFieldText);
      const event = { target: { value: 'kbn_saml' } };
      input.simulate('change', event);

      expect(handleAttributeSelectorChange).toHaveBeenCalledWith(
        'kbn_saml',
        baseProps.elasticsearchRoles[0]
      );
    });

    it('should call the "handleAttributeSelectorChange" prop when attribute value is selected', () => {
      const wrapper = shallow(<AttributeSelector {...baseProps} attributeName="role" />);
      const select = wrapper.find('[data-test-subj="ElasticsearchRoleSelect"]');
      const event = { target: { value: 'kbn_saml' } };
      select.simulate('change', event);

      expect(handleAttributeSelectorChange).toHaveBeenCalledWith(
        'kbn_saml',
        baseProps.elasticsearchRoles[0]
      );
    });
  });
});
