/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  urlEmpty: i18n.translate('xpack.remoteClusters.cloudDeploymentForm.urlRequiredError', {
    defaultMessage: 'A url is required',
  }),
  urlInvalid: i18n.translate('xpack.remoteClusters.cloudDeploymentForm.urlInvalidError', {
    defaultMessage: 'Url is invalid',
  }),
};

const PORT = 9400;
const EMPTY_PROXY_VALUES = { proxyAddress: '', serverName: '' };
const PROTOCOL_REGEX = new RegExp(/^https?:\/\//);

const hasProtocol = (url: string): boolean => PROTOCOL_REGEX.test(url);
const formatUrl = (url: string) => {
  url = (url ?? '').trim().toLowerCase();
  // add protocol if missing to avoid URL constructor throwing error
  if (!hasProtocol(url)) {
    url = `${'http://'}${url}`;
  }
  return url;
};

export const convertCloudUrlToProxyConnection = (
  cloudDeploymentUrl: string = ''
): { proxyAddress: string; serverName: string } => {
  cloudDeploymentUrl = formatUrl(cloudDeploymentUrl);
  if (!cloudDeploymentUrl) {
    return EMPTY_PROXY_VALUES;
  }
  let url: URL;
  try {
    url = new URL(cloudDeploymentUrl);
    const hostname = url.hostname;
    return { proxyAddress: `${hostname}:${PORT}`, serverName: hostname };
  } catch (err) {
    return EMPTY_PROXY_VALUES;
  }
};

export const validateCloudUrl = (cloudDeploymentUrl: string): string | null => {
  cloudDeploymentUrl = formatUrl(cloudDeploymentUrl);
  if (!cloudDeploymentUrl) {
    return i18nTexts.urlEmpty;
  }
  try {
    new URL(cloudDeploymentUrl);
  } catch (err) {
    return i18nTexts.urlInvalid;
  }
  return null;
};
