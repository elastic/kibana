/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { EuiSteps, EuiButton, EuiButtonEmpty } from '@elastic/eui';

import { sourceConfigData } from '../../../../__mocks__/content_sources.mock';
import { staticSourceData } from '../../source_data';

import { ApiKey } from '../../../../components/shared/api_key';
import { ConfigDocsLinks } from './config_docs_links';

import { SaveConfig } from './save_config';

describe('SaveConfig', () => {
  const advanceStep = jest.fn();
  const goBackStep = jest.fn();
  const onDeleteConfig = jest.fn();
  const setClientIdValue = jest.fn();
  const setClientSecretValue = jest.fn();
  const setBaseUrlValue = jest.fn();

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
      setClientIdValue,
      setClientSecretValue,
      setBaseUrlValue,
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

  describe('credentials item', () => {
    it('handles Client Id change', () => {
      const wrapper = shallow(<SaveConfig {...props} />);
      const steps = wrapper.find(EuiSteps);
      const input = steps.dive().find('[name="client-id"]');
      input.simulate('change', { target: { value: 'client-id' } });

      expect(setClientIdValue).toHaveBeenCalledWith('client-id');
    });

    it('handles Client secret change', () => {
      const wrapper = shallow(<SaveConfig {...props} />);
      const steps = wrapper.find(EuiSteps);
      const input = steps.dive().find('[name="client-secret"]');
      input.simulate('change', { target: { value: 'client-secret' } });

      expect(setClientSecretValue).toHaveBeenCalledWith('client-secret');
    });
  });

  describe('public key item', () => {
    const publicProps = {
      ...props,
      configuration: publicKeySourceConfig,
    };

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
      expect(steps.dive().find(ConfigDocsLinks)).toHaveLength(1);
    });

    it('handles Base URI change', () => {
      const wrapper = shallow(<SaveConfig {...publicProps} />);
      const steps = wrapper.find(EuiSteps);
      const input = steps.dive().find('[name="base-uri"]');
      input.simulate('change', { target: { value: 'base-uri' } });

      expect(setBaseUrlValue).toHaveBeenCalledWith('base-uri');
    });
  });

  it('handles Base URL change', () => {
    const wrapper = shallow(<SaveConfig {...props} configuration={needsBaseUrlSourceConfig} />);
    const steps = wrapper.find(EuiSteps);
    const input = steps.dive().find('[name="base-url"]');
    input.simulate('change', { target: { value: 'base-url' } });

    expect(setBaseUrlValue).toHaveBeenCalledWith('base-url');
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
