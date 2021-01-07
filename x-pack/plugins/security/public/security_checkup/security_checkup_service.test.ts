/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MountPoint } from 'kibana/public';

import { docLinksServiceMock } from '../../../../../src/core/public/mocks';
import { mockSecurityOssPlugin } from '../../../../../src/plugins/security_oss/public/mocks';
import { insecureClusterAlertTitle } from './components';
import { SecurityCheckupService } from './security_checkup_service';

let mockOnDismiss = jest.fn();

jest.mock('./components', () => {
  return {
    insecureClusterAlertTitle: 'mock insecure cluster title',
    insecureClusterAlertText: (getDocLinksService: any, onDismiss: any) => {
      mockOnDismiss = onDismiss;
      const { insecureClusterAlertText } = jest.requireActual(
        './components/insecure_cluster_alert'
      );
      return insecureClusterAlertText(getDocLinksService, onDismiss);
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

      expect(securityOssSetup.insecureCluster.setAlertText).toHaveBeenCalledTimes(1);
    });
  });
  describe('#start', () => {
    it('onDismiss triggers hiding of the alert', async () => {
      const securityOssSetup = mockSecurityOssPlugin.createSetup();
      const securityOssStart = mockSecurityOssPlugin.createStart();
      const service = new SecurityCheckupService();
      service.setup({ securityOssSetup });
      service.start({ securityOssStart, docLinks: docLinksServiceMock.createStartContract() });

      expect(securityOssStart.insecureCluster.hideAlert).toHaveBeenCalledTimes(0);

      mockOnDismiss();

      expect(securityOssStart.insecureCluster.hideAlert).toHaveBeenCalledTimes(1);
    });

    it('configures the doc link correctly', async () => {
      const securityOssSetup = mockSecurityOssPlugin.createSetup();
      const securityOssStart = mockSecurityOssPlugin.createStart();
      const service = new SecurityCheckupService();
      service.setup({ securityOssSetup });
      service.start({ securityOssStart, docLinks: docLinksServiceMock.createStartContract() });

      const [alertText] = securityOssSetup.insecureCluster.setAlertText.mock.calls[0];

      const container = document.createElement('div');
      (alertText as MountPoint)(container);

      const docLink = container
        .querySelector('[data-test-subj="learnMoreButton"]')
        ?.getAttribute('href');

      expect(docLink).toMatchInlineSnapshot(
        `"https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/get-started-enable-security.html?blade=kibanasecuritymessage"`
      );
    });
  });
});
