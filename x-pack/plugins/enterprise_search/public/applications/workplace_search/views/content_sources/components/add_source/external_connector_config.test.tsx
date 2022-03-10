/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';
import { sourceConfigData } from '../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSteps } from '@elastic/eui';

import { staticSourceData } from '../../source_data';

import { ExternalConnectorConfig } from './external_connector_config';

describe('ExternalConnectorConfig', () => {
  const goBack = jest.fn();
  const onDeleteConfig = jest.fn();
  const setExternalConnectorApiKey = jest.fn();
  const setExternalConnectorUrl = jest.fn();
  const saveExternalConnectorConfig = jest.fn();
  const fetchExternalSource = jest.fn();

  const props = {
    sourceData: staticSourceData[0],
    goBack,
    onDeleteConfig,
  };

  const values = {
    sourceConfigData,
    buttonLoading: false,
    clientIdValue: 'foo',
    clientSecretValue: 'bar',
    baseUrlValue: 'http://foo.baz',
    hasPlatinumLicense: true,
  };

  beforeEach(() => {
    setMockActions({
      setExternalConnectorApiKey,
      setExternalConnectorUrl,
      saveExternalConnectorConfig,
      fetchExternalSource,
    });
    setMockValues({ ...values });
  });

  it('renders', () => {
    const wrapper = shallow(<ExternalConnectorConfig {...props} />);

    expect(wrapper.find(EuiSteps)).toHaveLength(1);
  });

  it('handles form submission', () => {
    const wrapper = shallow(<ExternalConnectorConfig {...props} />);

    const preventDefault = jest.fn();
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(saveExternalConnectorConfig).toHaveBeenCalled();
  });

  describe('external connector configuration', () => {
    it('handles url change', () => {
      const wrapper = shallow(<ExternalConnectorConfig {...props} />);
      const steps = wrapper.find(EuiSteps);
      const input = steps.dive().find('[name="external-connector-url"]');
      input.simulate('change', { target: { value: 'url' } });

      expect(setExternalConnectorUrl).toHaveBeenCalledWith('url');
    });

    it('handles Client secret change', () => {
      const wrapper = shallow(<ExternalConnectorConfig {...props} />);
      const steps = wrapper.find(EuiSteps);
      const input = steps.dive().find('[name="external-connector-api-key"]');
      input.simulate('change', { target: { value: 'api-key' } });

      expect(setExternalConnectorApiKey).toHaveBeenCalledWith('api-key');
    });
  });
});
