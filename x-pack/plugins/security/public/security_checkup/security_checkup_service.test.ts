/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockSecurityOssPlugin } from '../../../../../src/plugins/security_oss/public/mocks';
import { insecureClusterAlertTitle } from './components';
import { SecurityCheckupService } from './security_checkup_service';

let mockOnDismiss = jest.fn();

jest.mock('./components', () => {
  return {
    insecureClusterAlertTitle: 'mock insecure cluster title',
    insecureClusterAlertText: (onDismiss: any) => {
      mockOnDismiss = onDismiss;
      return 'mock insecure cluster text';
    },
  };
});

describe('SecurityCheckupService', () => {
  describe('#setup', () => {
    it('configures the alert title and text for the default distribution', async () => {
      const securityOssSetup = mockSecurityOssPlugin.createSetup();
      const service = new SecurityCheckupService();
      service.setup({ securityOssSetup });

      expect(securityOssSetup.insecureCluster.setAlertTitle).toHaveBeenCalledWith(
        insecureClusterAlertTitle
      );

      expect(securityOssSetup.insecureCluster.setAlertText).toHaveBeenCalledWith(
        'mock insecure cluster text'
      );
    });
  });
  describe('#start', () => {
    it('onDismiss triggers hiding of the alert', async () => {
      const securityOssSetup = mockSecurityOssPlugin.createSetup();
      const securityOssStart = mockSecurityOssPlugin.createStart();
      const service = new SecurityCheckupService();
      service.setup({ securityOssSetup });
      service.start({ securityOssStart });

      expect(securityOssStart.insecureCluster.hideAlert).toHaveBeenCalledTimes(0);

      mockOnDismiss();

      expect(securityOssStart.insecureCluster.hideAlert).toHaveBeenCalledTimes(1);
    });
  });
});
