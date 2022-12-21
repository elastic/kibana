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

import { EuiSteps, EuiButton, EuiButtonEmpty } from '@elastic/eui';

import { ApiKey } from '../../../../components/shared/api_key';
import { staticSourceData } from '../../source_data';

import { ExternalConnectorFormFields } from './add_external_connector';
import { SaveConfig } from './save_config';

describe('SaveConfig', () => {
  const advanceStep = jest.fn();
  const goBackStep = jest.fn();
  const onDeleteConfig = jest.fn();
  const setConfiguredField = jest.fn();
  const setExternalConnectorUrl = jest.fn();
  const setExternalConnectorApiKey = jest.fn();

  const credentialsSourceConfig = staticSourceData[0].configuration;
  const needsBaseUrlSourceConfig = staticSourceData[1].configuration;
  const publicKeySourceConfig = staticSourceData[2].configuration;
  const accountContextOnlySourceConfig = staticSourceData[6].configuration;

  const props = {
    name: 'foo',
    configuration: credentialsSourceConfig,
    advanceStep,
    goBackStep,
    onDeleteConfig,
    header: <h1>Header</h1>,
  };

  const publicProps = {
    ...props,
    configuration: publicKeySourceConfig,
  };

  const values = {
    sourceConfigData,
    buttonLoading: false,
    clientIdValue: 'foo',
    clientSecretValue: 'bar',
    baseUrlValue: 'http://foo.baz',
    hasPlatinumLicense: true,
    configuredFields: {},
  };

  beforeEach(() => {
    setMockActions({
      setConfiguredField,
      setExternalConnectorUrl,
      setExternalConnectorApiKey,
    });
    setMockValues({ ...values });
  });

  it('renders', () => {
    const wrapper = shallow(<SaveConfig {...props} />);

    expect(wrapper.find(EuiSteps)).toHaveLength(1);
  });

  it('handles form submission', () => {
    const wrapper = shallow(<SaveConfig {...props} />);

    const preventDefault = jest.fn();
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(advanceStep).toHaveBeenCalled();
  });

  describe('external connector', () => {
    const externalConnectorConfigData = { ...sourceConfigData, serviceType: 'external' };

    it('shows external url fields', () => {
      setMockValues({ ...values, sourceConfigData: externalConnectorConfigData });
      const wrapper = shallow(<SaveConfig {...props} />);
      expect(wrapper.find(EuiSteps).dive().find(ExternalConnectorFormFields)).toHaveLength(1);
    });
  });

  describe('credentials item', () => {
    it('handles Client Id change', () => {
      const wrapper = shallow(<SaveConfig {...props} />);
      const steps = wrapper.find(EuiSteps);
      const input = steps.dive().find('[name="client_id"]');
      input.simulate('change', { target: { value: 'test-value' } });

      expect(setConfiguredField).toHaveBeenCalledWith('client_id', 'test-value');
    });

    it('handles Client secret change', () => {
      const wrapper = shallow(<SaveConfig {...props} />);
      const steps = wrapper.find(EuiSteps);
      const input = steps.dive().find('[name="client_secret"]');
      input.simulate('change', { target: { value: 'test-value' } });

      expect(setConfiguredField).toHaveBeenCalledWith('client_secret', 'test-value');
    });
  });

  describe('public key item', () => {
    beforeEach(() => {
      setMockValues({
        ...values,
        configuredFields: {
          ...values.configuredFields,
          public_key: '1234',
          consumer_key: '5678',
        },
      });
    });

    it('renders form controls', () => {
      const wrapper = shallow(<SaveConfig {...publicProps} />);
      const steps = wrapper.find(EuiSteps);

      expect(steps.dive().find(EuiButton)).toHaveLength(2);
      expect(steps.dive().find(EuiButtonEmpty)).toHaveLength(1);
    });

    it('renders ApiKeys', () => {
      const wrapper = shallow(<SaveConfig {...publicProps} />);
      const steps = wrapper.find(EuiSteps);

      expect(steps.dive().find(ApiKey)).toHaveLength(2);
    });
  });

  it('handles Base URL change', () => {
    const wrapper = shallow(<SaveConfig {...props} configuration={needsBaseUrlSourceConfig} />);
    const steps = wrapper.find(EuiSteps);
    const input = steps.dive().find('[name="base_url"]');
    input.simulate('change', { target: { value: 'test-value' } });

    expect(setConfiguredField).toHaveBeenCalledWith('base_url', 'test-value');
  });

  it('hides form controls for non-platinum users on account-only source', () => {
    setMockValues({ ...values, hasPlatinumLicense: false });

    const wrapper = shallow(
      <SaveConfig {...props} configuration={accountContextOnlySourceConfig} />
    );
    const steps = wrapper.find(EuiSteps);

    expect(steps.dive().find(EuiButton)).toHaveLength(2);
  });
});
