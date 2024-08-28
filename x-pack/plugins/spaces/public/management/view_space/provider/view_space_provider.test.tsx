/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { PropsWithChildren } from 'react';
import React from 'react';

import {
  httpServiceMock,
  i18nServiceMock,
  notificationServiceMock,
  overlayServiceMock,
  themeServiceMock,
} from '@kbn/core/public/mocks';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { useViewSpaceServices, useViewSpaceStore, ViewSpaceProvider } from './view_space_provider';
import { spacesManagerMock } from '../../../spaces_manager/spaces_manager.mock';
import { getPrivilegeAPIClientMock } from '../../privilege_api_client.mock';
import { getRolesAPIClientMock } from '../../roles_api_client.mock';

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();
const overlays = overlayServiceMock.createStartContract();
const theme = themeServiceMock.createStartContract();
const i18n = i18nServiceMock.createStartContract();

const spacesManager = spacesManagerMock.create();

const SUTProvider = ({
  children,
  capabilities = {
    navLinks: {},
    management: {},
    catalogue: {},
    spaces: { manage: true },
  },
}: PropsWithChildren<Partial<Pick<ApplicationStart, 'capabilities'>>>) => {
  return (
    <IntlProvider locale="en">
      <ViewSpaceProvider
        {...{
          i18n,
          http,
          theme,
          overlays,
          notifications,
          spacesManager,
          serverBasePath: '',
          getUrlForApp: (_) => _,
          getRolesAPIClient: getRolesAPIClientMock,
          getPrivilegesAPIClient: getPrivilegeAPIClientMock,
          navigateToUrl: jest.fn(),
          capabilities,
        }}
      >
        {children}
      </ViewSpaceProvider>
    </IntlProvider>
  );
};

describe('ViewSpaceProvider', () => {
  describe('useViewSpaceServices', () => {
    it('returns an object of predefined properties', () => {
      const { result } = renderHook(useViewSpaceServices, { wrapper: SUTProvider });

      expect(result.current).toEqual(
        expect.objectContaining({
          invokeClient: expect.any(Function),
        })
      );
    });

    it('throws when the hook is used within a tree that does not have the provider', () => {
      const { result } = renderHook(useViewSpaceServices);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toEqual(
        expect.stringMatching('ViewSpaceService Context is missing.')
      );
    });
  });

  describe('useViewSpaceStore', () => {
    it('returns an object of predefined properties', () => {
      const { result } = renderHook(useViewSpaceStore, { wrapper: SUTProvider });

      expect(result.current).toEqual(
        expect.objectContaining({
          state: expect.objectContaining({ roles: expect.any(Map) }),
          dispatch: expect.any(Function),
        })
      );
    });

    it('throws when the hook is used within a tree that does not have the provider', () => {
      const { result } = renderHook(useViewSpaceStore);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toEqual(
        expect.stringMatching('ViewSpaceStore Context is missing.')
      );
    });
  });
});
