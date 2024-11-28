/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import {
  httpServiceMock,
  i18nServiceMock,
  loggingSystemMock,
  notificationServiceMock,
  overlayServiceMock,
  themeServiceMock,
} from '@kbn/core/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { EditSpaceContentTab } from './edit_space_content_tab';
import { EditSpaceProviderRoot } from './provider';
import type { Space } from '../../../common';
import { spacesManagerMock } from '../../spaces_manager/spaces_manager.mock';
import type { SpaceContentTypeSummaryItem } from '../../types';
import { getPrivilegeAPIClientMock } from '../privilege_api_client.mock';
import { getRolesAPIClientMock } from '../roles_api_client.mock';
import { getSecurityLicenseMock } from '../security_license.mock';

const getUrlForApp = (appId: string) => appId;
const navigateToUrl = jest.fn();
const spacesManager = spacesManagerMock.create();
const getRolesAPIClient = getRolesAPIClientMock;
const getPrivilegeAPIClient = getPrivilegeAPIClientMock;

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();
const overlays = overlayServiceMock.createStartContract();
const theme = themeServiceMock.createStartContract();
const i18n = i18nServiceMock.createStartContract();
const logger = loggingSystemMock.createLogger();

const TestComponent: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <IntlProvider locale="en">
      <EditSpaceProviderRoot
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        getUrlForApp={getUrlForApp}
        navigateToUrl={navigateToUrl}
        serverBasePath=""
        spacesManager={spacesManager}
        getRolesAPIClient={getRolesAPIClient}
        http={http}
        notifications={notifications}
        overlays={overlays}
        getIsRoleManagementEnabled={() => Promise.resolve(() => undefined)}
        getPrivilegesAPIClient={getPrivilegeAPIClient}
        getSecurityLicense={getSecurityLicenseMock}
        theme={theme}
        i18n={i18n}
        logger={logger}
      >
        {children}
      </EditSpaceProviderRoot>
    </IntlProvider>
  );
};

describe('EditSpaceContentTab', () => {
  const space: Space = {
    id: '1',
    name: 'space1',
    disabledFeatures: [],
  };

  const getSpaceContentSpy = jest.spyOn(spacesManager, 'getContentForSpace');

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render with a loading indicator initially', () => {
    render(
      <TestComponent>
        <EditSpaceContentTab space={space} />
      </TestComponent>
    );

    expect(screen.getByTestId('editSpaceContentTabLoadingIndicator')).toBeInTheDocument();
  });

  it('should render the space content on resolving the saved objects within the space', async () => {
    const spaceContentSummary: SpaceContentTypeSummaryItem[] = [
      {
        type: 'dashboard',
        count: 1,
        displayName: 'Dashboard',
      },
    ];

    getSpaceContentSpy.mockResolvedValue({
      summary: spaceContentSummary,
      total: spaceContentSummary.length,
    });

    render(
      <TestComponent>
        <EditSpaceContentTab space={space} />
      </TestComponent>
    );

    await waitFor(() => new Promise((resolve) => resolve(null)));

    expect(getSpaceContentSpy).toHaveBeenCalledTimes(1);
    expect(getSpaceContentSpy).toHaveBeenCalledWith(space.id);

    expect(screen.queryByTestId('editSpaceContentTabLoadingIndicator')).not.toBeInTheDocument();

    spaceContentSummary.forEach((item) => {
      expect(screen.getByTestId(`space-content-row-${item.type}`)).toBeInTheDocument();
    });
  });
});
