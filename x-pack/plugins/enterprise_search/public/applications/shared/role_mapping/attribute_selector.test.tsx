/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFieldText, EuiFormRow } from '@elastic/eui';

import { AttributeName } from '../types';

import { AttributeSelector } from './attribute_selector';
import { REQUIRED_LABEL } from './constants';

const handleAttributeSelectorChange = jest.fn();
const handleAttributeValueChange = jest.fn();

const baseProps = {
  attributeName: 'username' as AttributeName,
  attributeValue: 'Something',
  attributeValueInvalid: false,
  attributes: ['a', 'b', 'c'],
  elasticsearchRoles: ['whatever'],
  disabled: false,
  handleAttributeSelectorChange,
  handleAttributeValueChange,
};

describe('AttributeSelector', () => {
  it('renders', () => {
    const wrapper = shallow(<AttributeSelector {...baseProps} />);

    expect(wrapper.find('[data-test-subj="AttributeSelector"]').exists()).toBe(true);
  });

  describe('Form controls', () => {
    it('handles fallback props', () => {
      const wrapper = shallow(<AttributeSelector {...baseProps} attributeValue={undefined} />);

      expect(wrapper.find(EuiFieldText).prop('value')).toEqual('');
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

    it('shows helpText when attributeValueInvalid', () => {
      const wrapper = shallow(<AttributeSelector {...baseProps} attributeValueInvalid />);
      const formRow = wrapper.find(EuiFormRow).at(1);

      expect(formRow.prop('helpText')).toEqual(REQUIRED_LABEL);
    });
  });
});
