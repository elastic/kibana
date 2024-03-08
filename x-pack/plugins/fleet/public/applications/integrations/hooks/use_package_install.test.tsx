/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, type WrapperComponent } from '@testing-library/react-hooks';

import { createIntegrationsTestRendererMock } from '../../../mock';

import { useInstallPackage, PackageInstallProvider } from './use_package_install';

describe('usePackageInstall', () => {
  beforeEach(() => {
    createIntegrationsTestRendererMock();
  });

  describe('useInstallPackage', () => {
    function createRenderer() {
      const renderer = createIntegrationsTestRendererMock();
      renderer.startServices.http.post.mockImplementation((async (path: string) => {
        if (path === '/api/fleet/epm/packages/test/1.0.0') {
          return { data: {} };
        }
        if (path === '/api/fleet/epm/packages/test-install-error/1.0.0') {
          const error = {
            body: {
              message: 'install error not implemented',
            },
          };
          throw error;
        }
        const error = {
          body: {
            message: 'not implemented',
          },
        };
        throw error;
      }) as any);

      const notifications = renderer.startServices.notifications;
      const wrapper: WrapperComponent<any> = ({ children }) => (
        <PackageInstallProvider
          notifications={notifications}
          theme$={renderer.startServices.theme.theme$}
        >
          {children}
        </PackageInstallProvider>
      );
      const { result } = renderer.renderHook(() => useInstallPackage(), wrapper);

      const installPackage = result.current;

      return {
        installPackage,
        notifications,
      };
    }

    it('should work for install', async () => {
      const { notifications, installPackage } = createRenderer();
      let res: boolean | undefined;
      await act(async () => {
        res = await installPackage({
          name: 'test',
          title: 'TestTitle',
          version: '1.0.0',
        });
      });

      expect(notifications.toasts.addError).not.toBeCalled();
      expect(notifications.toasts.addSuccess).toBeCalled();

      expect(res).toBeTruthy();
    });

    it('should work for upgrade', async () => {
      const { notifications, installPackage } = createRenderer();
      let res: boolean | undefined;
      await act(async () => {
        res = await installPackage({
          name: 'test',
          title: 'TestTitle',
          version: '1.0.0',
          isUpgrade: true,
        });
      });

      expect(notifications.toasts.addError).not.toBeCalled();
      expect(notifications.toasts.addSuccess).toBeCalled();

      expect(res).toBeTruthy();
    });

    it('should handle install error', async () => {
      const { notifications, installPackage } = createRenderer();

      let res: boolean | undefined;
      await act(async () => {
        res = await installPackage({
          name: 'test-install-error',
          title: 'TestTitle',
          version: '1.0.0',
        });
      });

      expect(notifications.toasts.addSuccess).not.toBeCalled();
      expect(notifications.toasts.addError).toBeCalled();

      expect(res).toBeFalsy();
    });
  });
});
