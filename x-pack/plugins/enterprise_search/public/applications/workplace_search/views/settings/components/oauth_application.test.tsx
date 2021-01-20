/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { EuiModal, EuiForm } from '@elastic/eui';

import { oauthApplication } from '../../../__mocks__/content_sources.mock';
import { OAUTH_DESCRIPTION, REDIRECT_INSECURE_ERROR_TEXT } from '../../../constants';

import { CredentialItem } from '../../../components/shared/credential_item';
import { ViewContentHeader } from '../../../components/shared/view_content_header';
import { OauthApplication } from './oauth_application';

describe('OauthApplication', () => {
  const setOauthApplication = jest.fn();
  const updateOauthApplication = jest.fn();

  beforeEach(() => {
    setMockValues({ hasPlatinumLicense: true, oauthApplication });
    setMockActions({ setOauthApplication, updateOauthApplication });
  });

  it('renders', () => {
    const wrapper = shallow(<OauthApplication />);

    expect(wrapper.find(EuiForm)).toHaveLength(1);
  });

  it('does not render when no oauthApp', () => {
    setMockValues({ hasPlatinumLicense: true, oauthApplication: undefined });
    const wrapper = shallow(<OauthApplication />);

    expect(wrapper.find(EuiForm)).toHaveLength(0);
  });

  it('handles OAuthAppName change', () => {
    const wrapper = shallow(<OauthApplication />);
    const input = wrapper.find('[data-test-subj="OAuthAppName"]');
    input.simulate('change', { target: { value: 'foo' } });

    expect(setOauthApplication).toHaveBeenCalledWith({ ...oauthApplication, name: 'foo' });
  });

  it('handles RedirectURIsTextArea change', () => {
    const wrapper = shallow(<OauthApplication />);
    const input = wrapper.find('[data-test-subj="RedirectURIsTextArea"]');
    input.simulate('change', { target: { value: 'bar' } });

    expect(setOauthApplication).toHaveBeenCalledWith({
      ...oauthApplication,
      redirectUri: 'bar',
    });
  });

  it('handles ConfidentialToggle change', () => {
    const wrapper = shallow(<OauthApplication />);
    const input = wrapper.find('[data-test-subj="ConfidentialToggle"]');
    input.simulate('change', { target: { checked: true } });

    expect(setOauthApplication).toHaveBeenCalledWith({
      ...oauthApplication,
      confidential: true,
    });
  });

  it('handles form submission', () => {
    const wrapper = shallow(<OauthApplication />);
    const preventDefault = jest.fn();
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(updateOauthApplication).toHaveBeenCalled();
  });

  it('renders ClientSecret on confidential item', () => {
    setMockValues({
      hasPlatinumLicense: true,
      oauthApplication: {
        ...oauthApplication,
        confidential: true,
      },
    });
    const wrapper = shallow(<OauthApplication />);

    expect(wrapper.find(CredentialItem)).toHaveLength(2);
  });

  it('renders license modal', () => {
    setMockValues({
      hasPlatinumLicense: false,
      oauthApplication,
    });
    const wrapper = shallow(<OauthApplication />);

    expect(wrapper.find(EuiModal)).toHaveLength(1);
  });

  it('closes license modal', () => {
    setMockValues({
      hasPlatinumLicense: false,
      oauthApplication,
    });
    const wrapper = shallow(<OauthApplication />);
    wrapper.find(EuiModal).prop('onClose')();

    expect(wrapper.find(EuiModal)).toHaveLength(0);
  });

  it('handles conditional copy', () => {
    setMockValues({
      hasPlatinumLicense: true,
      oauthApplication: {
        ...oauthApplication,
        uid: undefined,
        redirectUri: 'http://foo',
      },
    });
    const wrapper = shallow(<OauthApplication />);

    expect(wrapper.find(ViewContentHeader).prop('description')).toEqual(OAUTH_DESCRIPTION);
    expect(wrapper.find('[data-test-subj="RedirectURIsRow"]').prop('error')).toEqual(
      REDIRECT_INSECURE_ERROR_TEXT
    );
  });
});
