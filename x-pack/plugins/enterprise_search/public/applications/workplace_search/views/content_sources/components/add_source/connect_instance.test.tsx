/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { EuiBadge, EuiCallOut, EuiSwitch } from '@elastic/eui';

import { FeatureIds } from '../../../../types';
import { staticSourceData } from '../../source_data';
import { ConnectInstance } from './connect_instance';

describe('ConnectInstance', () => {
  // Needed to mock redirect window.location.replace(oauthUrl)
  const mockReplace = jest.fn();
  const mockWindow = {
    value: {
      replace: mockReplace,
    },
    writable: true,
  };
  Object.defineProperty(window, 'location', mockWindow);

  const onFormCreated = jest.fn();
  const setSourceLoginValue = jest.fn();
  const setSourcePasswordValue = jest.fn();
  const setSourceSubdomainValue = jest.fn();
  const setSourceIndexPermissionsValue = jest.fn();
  const getSourceConnectData = jest.fn((_, redirectOauth) => {
    redirectOauth();
  });
  const createContentSource = jest.fn((_, redirectFormCreated, handleFormSubmitError) => {
    redirectFormCreated();
    handleFormSubmitError();
  });

  const credentialsSourceData = staticSourceData[13];
  const oauthSourceData = staticSourceData[0];
  const subdomainSourceData = staticSourceData[16];
  const privateSourceData = staticSourceData[6];

  const props = {
    ...credentialsSourceData,
    needsPermissions: true,
    onFormCreated,
    header: <h1>Header</h1>,
  };

  const oauthProps = {
    ...oauthSourceData,
    needsPermissions: true,
    onFormCreated,
    header: <h1>Header</h1>,
  };

  const values = {
    loginValue: 'login',
    passwordValue: 'pw123',
    indexPermissionsValue: true,
    subdomainValue: 'foo',
    isOrganization: true,
    hasPlatinumLicense: true,
  };

  beforeEach(() => {
    setMockActions({
      getSourceConnectData,
      createContentSource,
      setSourceLoginValue,
      setSourcePasswordValue,
      setSourceSubdomainValue,
      setSourceIndexPermissionsValue,
    });
    setMockValues({ ...values });
  });

  it('renders', () => {
    const wrapper = shallow(<ConnectInstance {...props} />);

    expect(wrapper.find('form')).toHaveLength(1);
  });

  it('handles form submission with credentials source', () => {
    const wrapper = shallow(<ConnectInstance {...props} />);

    const preventDefault = jest.fn();
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(createContentSource).toHaveBeenCalled();
  });

  it('handles username input change', () => {
    const wrapper = shallow(<ConnectInstance {...props} />);
    const TEXT = 'username';
    const input = wrapper.find('EuiFieldText[name="login"]');
    input.simulate('change', { target: { value: TEXT } });

    expect(setSourceLoginValue).toHaveBeenCalledWith(TEXT);
  });

  it('handles password input change', () => {
    const wrapper = shallow(<ConnectInstance {...props} />);
    const TEXT = 'password';
    const input = wrapper.find('EuiFieldText[name="password"]');
    input.simulate('change', { target: { value: TEXT } });

    expect(setSourcePasswordValue).toHaveBeenCalledWith(TEXT);
  });

  it('handles subdomain input change', () => {
    const wrapper = shallow(
      <ConnectInstance {...props} configuration={subdomainSourceData.configuration} />
    );
    const TEXT = 'subdomain';
    const input = wrapper.find('EuiFieldText[name="subdomain"]');
    input.simulate('change', { target: { value: TEXT } });

    expect(setSourceSubdomainValue).toHaveBeenCalledWith(TEXT);
  });

  it('shows correct feature badges', () => {
    setMockValues({ ...values, isOrganization: false });
    const wrapper = shallow(<ConnectInstance {...props} features={privateSourceData.features} />);

    expect(wrapper.find(EuiBadge)).toHaveLength(2);
  });

  it('shows no feature badges', () => {
    setMockValues({ ...values, isOrganization: false });
    const features = { ...privateSourceData.features };
    features.platinumPrivateContext = [FeatureIds.SyncFrequency];
    const wrapper = shallow(<ConnectInstance {...props} features={features as any} />);

    expect(wrapper.find(EuiBadge)).toHaveLength(0);
  });

  it('calls handler on click', () => {
    const wrapper = shallow(<ConnectInstance {...props} />);
    wrapper.find(EuiSwitch).simulate('change', { target: { checked: true } });

    expect(setSourceIndexPermissionsValue).toHaveBeenCalledWith(true);
  });

  it('handles form submission with oauth source', () => {
    jest.spyOn(window.location, 'replace').mockImplementationOnce(mockReplace);
    const wrapper = shallow(<ConnectInstance {...oauthProps} />);

    const preventDefault = jest.fn();
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(getSourceConnectData).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalled();
  });

  it('renders permissions link', () => {
    const wrapper = shallow(<ConnectInstance {...oauthProps} needsPermissions={false} />);

    expect(wrapper.find('[data-test-subj="NeedsPermissionsMessage"]')).toHaveLength(1);
  });

  it('shows permissions callout', () => {
    setMockValues({ ...values, indexPermissionsValue: false });
    const wrapper = shallow(<ConnectInstance {...props} features={privateSourceData.features} />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });
});
