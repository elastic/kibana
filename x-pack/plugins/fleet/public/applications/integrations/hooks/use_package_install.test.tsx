/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, type WrapperComponent } from '@testing-library/react-hooks';
import { coreMock } from '@kbn/core/public/mocks';

import { createIntegrationsTestRendererMock } from '../../../mock';

import { useInstallPackage, PackageInstallProvider } from './use_package_install';

describe('usePackageInstall', () => {
  const coreStart = coreMock.createStart();

  const addErrorSpy = jest.spyOn(coreStart.notifications.toasts, 'addError');
  const addSuccessSpy = jest.spyOn(coreStart.notifications.toasts, 'addSuccess');

  beforeEach(() => {
    createIntegrationsTestRendererMock();
    addErrorSpy.mockReset();
    addSuccessSpy.mockReset();
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

      const wrapper: WrapperComponent<any> = ({ children }) => (
        <PackageInstallProvider startServices={coreStart}>{children}</PackageInstallProvider>
      );
      const { result } = renderer.renderHook(() => useInstallPackage(), wrapper);

      const installPackage = result.current;

      return {
        installPackage,
      };
    }

    it('should work for install', async () => {
      const { installPackage } = createRenderer();
      let res: boolean | undefined;
      await act(async () => {
        res = await installPackage({
          name: 'test',
          title: 'TestTitle',
          version: '1.0.0',
        });
      });

      expect(addErrorSpy).not.toBeCalled();
      expect(addSuccessSpy).toBeCalled();

      expect(res).toBeTruthy();
    });

    it('should work for upgrade', async () => {
      const { installPackage } = createRenderer();
      let res: boolean | undefined;
      await act(async () => {
        res = await installPackage({
          name: 'test',
          title: 'TestTitle',
          version: '1.0.0',
          isUpgrade: true,
        });
      });

      expect(addErrorSpy).not.toBeCalled();
      expect(addSuccessSpy).toBeCalled();

      expect(res).toBeTruthy();
    });

    it('should handle install error', async () => {
      const { installPackage } = createRenderer();

      let res: boolean | undefined;
      await act(async () => {
        res = await installPackage({
          name: 'test-install-error',
          title: 'TestTitle',
          version: '1.0.0',
        });
      });

      expect(addSuccessSpy).not.toBeCalled();
      expect(addErrorSpy).toBeCalled();

      expect(res).toBeFalsy();
    });
  });
});
