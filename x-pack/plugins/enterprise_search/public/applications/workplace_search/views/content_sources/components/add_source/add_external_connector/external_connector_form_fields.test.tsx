/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut, EuiFieldText, EuiFormRow } from '@elastic/eui';

import { ExternalConnectorFormFields } from './external_connector_form_fields';

describe('ExternalConnectorConfig', () => {
  const setExternalConnectorApiKey = jest.fn();
  const setExternalConnectorUrl = jest.fn();
  const validateUrl = jest.fn();
  const fetchExternalSource = jest.fn();

  const values = {
    urlValid: true,
    externalConnectorApiKey: 'apiKey',
    externalConnectorUrl: 'url',
    formDisabled: false,
    showInsecureCallout: false,
  };

  beforeEach(() => {
    setMockActions({
      setExternalConnectorApiKey,
      setExternalConnectorUrl,
      validateUrl,
      fetchExternalSource,
    });
    setMockValues({ ...values });
  });

  it('renders', () => {
    const wrapper = shallow(<ExternalConnectorFormFields />);

    expect(wrapper.find(EuiFormRow)).toHaveLength(2);
    expect(wrapper.find(EuiCallOut)).toHaveLength(0);
    expect(fetchExternalSource).toHaveBeenCalled();
  });
  it('handles url change', () => {
    const wrapper = shallow(<ExternalConnectorFormFields />);
    const input = wrapper.find('[name="external-connector-url"]');
    input.simulate('change', { target: { value: 'newUrl' } });

    expect(setExternalConnectorUrl).toHaveBeenCalledWith('newUrl');
  });

  it('handles Client secret change', () => {
    const wrapper = shallow(<ExternalConnectorFormFields />);
    const input = wrapper.find('[name="external-connector-api-key"]');
    input.simulate('change', { target: { value: 'api-key' } });

    expect(setExternalConnectorApiKey).toHaveBeenCalledWith('api-key');
  });
  it('shows callout when showInsecureCallout is set to true', () => {
    setMockValues({ ...values, showInsecureUrlCallout: true });
    const wrapper = shallow(<ExternalConnectorFormFields />);
    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });

  it('disables form when form is set to disabled', () => {
    setMockValues({ ...values, formDisabled: true });
    const wrapper = shallow(<ExternalConnectorFormFields />);
    const textFields = wrapper.find(EuiFieldText);
    expect(textFields).toHaveLength(2);
    expect(textFields.get(0).props.disabled).toEqual(true);
    expect(textFields.get(1).props.disabled).toEqual(true);
  });

  it('calls validateUrl on blur', () => {
    const wrapper = shallow(<ExternalConnectorFormFields />);
    const input = wrapper.find('[name="external-connector-url"]');
    input.simulate('blur');
    expect(validateUrl).toHaveBeenCalled();
  });

  it('shows validation error', () => {
    setMockValues({ ...values, urlValid: false });
    const wrapper = shallow(<ExternalConnectorFormFields />);
    const formRow = wrapper.find(EuiFormRow).get(0);
    expect(formRow.props.error).toEqual(['Please use a valid URL']);
    expect(validateUrl).toHaveBeenCalled();
  });
});
