/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';
import { oauthApplication } from '../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiForm } from '@elastic/eui';

import { getPageDescription } from '../../../../test_helpers';

import { CredentialItem } from '../../../components/shared/credential_item';
import { OAUTH_DESCRIPTION, REDIRECT_INSECURE_ERROR_TEXT } from '../../../constants';

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
    wrapper.find(EuiForm).simulate('submit', { preventDefault });

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

  describe('non-platinum license content', () => {
    beforeEach(() => {
      setMockValues({
        hasPlatinumLicense: false,
        oauthApplication,
      });
    });

    it('renders pageTitle', () => {
      const wrapper = shallow(<OauthApplication />);

      expect(wrapper.prop('pageHeader').pageTitle).toMatchInlineSnapshot(`
        <React.Fragment>
          <LicenseBadge />
          <EuiSpacer
            size="s"
          />
          <EuiTitle
            size="l"
          >
            <h1>
              Configuring OAuth for Custom Search Applications
            </h1>
          </EuiTitle>
        </React.Fragment>
      `);
    });

    /* This href test should ultimately use the docLinkServiceMock */
    it('renders description', () => {
      const wrapper = shallow(<OauthApplication />);
      expect(wrapper.prop('pageHeader').description).toMatchInlineSnapshot(`
        <React.Fragment>
          <EuiText
            color="subdued"
          >
            Configure an OAuth application for secure use of the Workplace Search Search API. Upgrade to a Platinum license to enable the Search API and create your OAuth application.
          </EuiText>
          <EuiSpacer />
          <EuiLink
            external={true}
            href=""
            target="_blank"
          >
            Explore Platinum features
          </EuiLink>
        </React.Fragment>
      `);
    });
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

    expect(getPageDescription(wrapper)).toEqual(OAUTH_DESCRIPTION);
    expect(wrapper.find('[data-test-subj="RedirectURIsRow"]').prop('error')).toEqual(
      REDIRECT_INSECURE_ERROR_TEXT
    );
  });
});
