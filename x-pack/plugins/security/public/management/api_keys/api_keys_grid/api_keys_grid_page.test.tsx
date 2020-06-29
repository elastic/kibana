/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { ReactWrapper } from 'enzyme';
import { EuiCallOut } from '@elastic/eui';

import { NotEnabled } from './not_enabled';
import { PermissionDenied } from './permission_denied';
import { APIKeysAPIClient } from '../api_keys_api_client';
import { DocumentationLinksService } from '../documentation_links';
import { APIKeysGridPage } from './api_keys_grid_page';

import { coreMock } from '../../../../../../../src/core/public/mocks';
import { apiKeysAPIClientMock } from '../index.mock';

const mock500 = () => ({ body: { error: 'Internal Server Error', message: '', statusCode: 500 } });

const waitForRender = async (
  wrapper: ReactWrapper<any>,
  condition: (wrapper: ReactWrapper<any>) => boolean
) => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      await Promise.resolve();
      wrapper.update();
      if (condition(wrapper)) {
        resolve();
      }
    }, 10);

    setTimeout(() => {
      clearInterval(interval);
      reject(new Error('waitForRender timeout after 2000ms'));
    }, 2000);
  });
};

describe('APIKeysGridPage', () => {
  let apiClientMock: jest.Mocked<PublicMethodsOf<APIKeysAPIClient>>;
  beforeEach(() => {
    apiClientMock = apiKeysAPIClientMock.create();
    apiClientMock.checkPrivileges.mockResolvedValue({
      isAdmin: true,
      areApiKeysEnabled: true,
      canManage: true,
    });
    apiClientMock.getApiKeys.mockResolvedValue({
      apiKeys: [
        {
          creation: 1571322182082,
          expiration: 1571408582082,
          id: '0QQZ2m0BO2XZwgJFuWTT',
          invalidated: false,
          name: 'my-api-key',
          realm: 'reserved',
          username: 'elastic',
        },
      ],
    });
  });

  const coreStart = coreMock.createStart();

  const getViewProperties = () => {
    const { docLinks, notifications, application } = coreStart;
    return {
      docLinks: new DocumentationLinksService(docLinks),
      navigateToApp: application.navigateToApp,
      notifications,
      apiKeysAPIClient: apiClientMock,
    };
  };

  it('renders a loading state when fetching API keys', async () => {
    const wrapper = mountWithIntl(<APIKeysGridPage {...getViewProperties()} />);

    expect(wrapper.find('[data-test-subj="apiKeysSectionLoading"]')).toHaveLength(1);
  });

  it('renders a callout when API keys are not enabled', async () => {
    apiClientMock.checkPrivileges.mockResolvedValue({
      isAdmin: true,
      canManage: true,
      areApiKeysEnabled: false,
    });

    const wrapper = mountWithIntl(<APIKeysGridPage {...getViewProperties()} />);

    await waitForRender(wrapper, (updatedWrapper) => {
      return updatedWrapper.find(NotEnabled).length > 0;
    });

    expect(wrapper.find(NotEnabled)).toMatchSnapshot();
  });

  it('renders permission denied if user does not have required permissions', async () => {
    apiClientMock.checkPrivileges.mockResolvedValue({
      canManage: false,
      isAdmin: false,
      areApiKeysEnabled: true,
    });

    const wrapper = mountWithIntl(<APIKeysGridPage {...getViewProperties()} />);

    await waitForRender(wrapper, (updatedWrapper) => {
      return updatedWrapper.find(PermissionDenied).length > 0;
    });

    expect(wrapper.find(PermissionDenied)).toMatchSnapshot();
  });

  it('renders error callout if error fetching API keys', async () => {
    apiClientMock.getApiKeys.mockRejectedValue(mock500());

    const wrapper = mountWithIntl(<APIKeysGridPage {...getViewProperties()} />);

    await waitForRender(wrapper, (updatedWrapper) => {
      return updatedWrapper.find(EuiCallOut).length > 0;
    });

    expect(wrapper.find('EuiCallOut[data-test-subj="apiKeysError"]')).toHaveLength(1);
  });

  describe('Admin view', () => {
    let wrapper: ReactWrapper<any>;
    beforeEach(() => {
      wrapper = mountWithIntl(<APIKeysGridPage {...getViewProperties()} />);
    });

    it('renders a callout indicating the user is an administrator', async () => {
      const calloutEl = 'EuiCallOut[data-test-subj="apiKeyAdminDescriptionCallOut"]';

      await waitForRender(wrapper, (updatedWrapper) => {
        return updatedWrapper.find(calloutEl).length > 0;
      });

      expect(wrapper.find(calloutEl).text()).toEqual('You are an API Key administrator.');
    });

    it('renders the correct description text', async () => {
      const descriptionEl = 'EuiText[data-test-subj="apiKeysDescriptionText"]';

      await waitForRender(wrapper, (updatedWrapper) => {
        return updatedWrapper.find(descriptionEl).length > 0;
      });

      expect(wrapper.find(descriptionEl).text()).toEqual(
        'View and invalidate API keys. An API key sends requests on behalf of a user.'
      );
    });
  });

  describe('Non-admin view', () => {
    let wrapper: ReactWrapper<any>;
    beforeEach(() => {
      apiClientMock.checkPrivileges.mockResolvedValue({
        isAdmin: false,
        canManage: true,
        areApiKeysEnabled: true,
      });

      wrapper = mountWithIntl(<APIKeysGridPage {...getViewProperties()} />);
    });

    it('does NOT render a callout indicating the user is an administrator', async () => {
      const descriptionEl = 'EuiText[data-test-subj="apiKeysDescriptionText"]';
      const calloutEl = 'EuiCallOut[data-test-subj="apiKeyAdminDescriptionCallOut"]';

      await waitForRender(wrapper, (updatedWrapper) => {
        return updatedWrapper.find(descriptionEl).length > 0;
      });

      expect(wrapper.find(calloutEl).length).toEqual(0);
    });

    it('renders the correct description text', async () => {
      const descriptionEl = 'EuiText[data-test-subj="apiKeysDescriptionText"]';

      await waitForRender(wrapper, (updatedWrapper) => {
        return updatedWrapper.find(descriptionEl).length > 0;
      });

      expect(wrapper.find(descriptionEl).text()).toEqual(
        'View and invalidate your API keys. An API key sends requests on your behalf.'
      );
    });
  });
});
