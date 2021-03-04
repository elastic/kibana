/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const PORT = 9400;
export const convertCloudUrlToProxyConnection = (
  cloudDeploymentUrl: string = ''
): { proxyAddress: string; serverName: string } => {
  if (!cloudDeploymentUrl) {
    return { proxyAddress: '', serverName: '' };
  }
  const url = new URL(cloudDeploymentUrl);
  const hostname = url.hostname;
  return { proxyAddress: `${hostname}:${PORT}`, serverName: hostname };
};

export const validateCloudUrl = (cloudUrl: string): string | null => {
  if (!cloudUrl) {
    return i18n.translate('xpack.remoteClusters.cloudDeploymentForm.urlRequiredError', {
      defaultMessage: 'A url is required',
    });
  }
  return null;
};
