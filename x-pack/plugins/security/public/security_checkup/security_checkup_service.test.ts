/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nextTick } from '@kbn/test/jest';
import type { DocLinksStart } from 'src/core/public';
import { coreMock } from 'src/core/public/mocks';

import type { ConfigType } from '../config';
import { SecurityCheckupService } from './security_checkup_service';

let mockOnDismissCallback: (persist: boolean) => void = jest.fn().mockImplementation(() => {
  throw new Error('expected callback to be replaced!');
});

jest.mock('./components', () => {
  return {
    insecureClusterAlertTitle: 'mock insecure cluster title',
    insecureClusterAlertText: (
      _getDocLinks: () => DocLinksStart,
      onDismiss: (persist: boolean) => void
    ) => {
      mockOnDismissCallback = onDismiss;
      return 'mock insecure cluster text';
    },
  };
});

interface InitOpts {
  tenant?: string;
}

function initCore({ tenant = '/server-base-path' }: InitOpts = {}) {
  const coreSetup = coreMock.createSetup();
  (coreSetup.http.basePath.serverBasePath as string) = tenant;

  const coreStart = coreMock.createStart();
  coreStart.notifications.toasts.addWarning.mockReturnValue({ id: 'mock_alert_id' });
  return { coreSetup, coreStart };
}

describe('SecurityCheckupService', () => {
  describe('display scenarios', () => {
    it('does not display an alert when the warning is explicitly disabled via config', async () => {
      const config = { showInsecureClusterWarning: false } as ConfigType;
      const { coreSetup, coreStart } = initCore();
      const storage = coreMock.createStorage();

      coreStart.http.get.mockResolvedValue({ displayAlert: true });

      const service = new SecurityCheckupService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart });

      await nextTick();

      expect(coreStart.http.get).not.toHaveBeenCalled();
      expect(coreStart.notifications.toasts.addWarning).not.toHaveBeenCalled();

      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('does not display an alert when state indicates that alert should not be shown', async () => {
      const config = { showInsecureClusterWarning: true } as ConfigType;
      const { coreSetup, coreStart } = initCore();
      const storage = coreMock.createStorage();

      coreStart.http.get.mockResolvedValue({ displayAlert: false });

      const service = new SecurityCheckupService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart });

      await nextTick();

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning).not.toHaveBeenCalled();

      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('only reads storage information from the current tenant', async () => {
      const config = { showInsecureClusterWarning: true } as ConfigType;
      const { coreSetup, coreStart } = initCore({ tenant: '/my-specific-tenant' });

      const storage = coreMock.createStorage();
      storage.getItem.mockReturnValue(JSON.stringify({ show: false }));

      coreStart.http.get.mockResolvedValue({ displayAlert: true });

      const service = new SecurityCheckupService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart });

      await nextTick();

      expect(storage.getItem).toHaveBeenCalledTimes(1);
      expect(storage.getItem).toHaveBeenCalledWith(
        'insecureClusterWarningVisibility/my-specific-tenant'
      );
    });

    it('does not display an alert when hidden via storage', async () => {
      const config = { showInsecureClusterWarning: true } as ConfigType;
      const { coreSetup, coreStart } = initCore();

      const storage = coreMock.createStorage();
      storage.getItem.mockReturnValue(JSON.stringify({ show: false }));

      coreStart.http.get.mockResolvedValue({ displayAlert: true });

      const service = new SecurityCheckupService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart });

      await nextTick();

      expect(coreStart.http.get).not.toHaveBeenCalled();
      expect(coreStart.notifications.toasts.addWarning).not.toHaveBeenCalled();

      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('displays an alert when persisted preference is corrupted', async () => {
      const config = { showInsecureClusterWarning: true } as ConfigType;
      const { coreSetup, coreStart } = initCore();

      const storage = coreMock.createStorage();
      storage.getItem.mockReturnValue('{ this is a string of invalid JSON');

      coreStart.http.get.mockResolvedValue({ displayAlert: true });

      const service = new SecurityCheckupService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart });

      await nextTick();

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);

      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('displays an alert when enabled via config and endpoint checks', async () => {
      const config = { showInsecureClusterWarning: true } as ConfigType;
      const { coreSetup, coreStart } = initCore();
      const storage = coreMock.createStorage();

      coreStart.http.get.mockResolvedValue({ displayAlert: true });

      const service = new SecurityCheckupService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart });

      await nextTick();

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "iconType": "alert",
            "text": "mock insecure cluster text",
            "title": "mock insecure cluster title",
          },
          Object {
            "toastLifeTimeMs": 864000000,
          },
        ]
      `);

      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('dismisses the alert when requested, and remembers this preference', async () => {
      const config = { showInsecureClusterWarning: true } as ConfigType;
      const { coreSetup, coreStart } = initCore();
      const storage = coreMock.createStorage();

      coreStart.http.get.mockResolvedValue({ displayAlert: true });

      const service = new SecurityCheckupService(config, storage);
      service.setup({ core: coreSetup });
      service.start({ core: coreStart });

      await nextTick();

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);

      mockOnDismissCallback(true);

      expect(coreStart.notifications.toasts.remove).toHaveBeenCalledTimes(1);
      expect(storage.setItem).toHaveBeenCalledWith(
        'insecureClusterWarningVisibility/server-base-path',
        JSON.stringify({ show: false })
      );
    });
  });
});
