/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { Cluster } from '../../../../../../common/lib';

export const i18nTexts = {
  urlEmpty: (
    <FormattedMessage
      id="xpack.remoteClusters.cloudDeploymentForm.urlRequiredError"
      defaultMessage="A url is required"
    />
  ),
  urlInvalid: (
    <FormattedMessage
      id="xpack.remoteClusters.cloudDeploymentForm.urlInvalidError"
      defaultMessage="Url is invalid"
    />
  ),
};

const CLOUD_DEFAULT_PROXY_PORT = '9400';
const EMPTY_PROXY_VALUES = { proxyAddress: '', serverName: '' };
const PROTOCOL_REGEX = new RegExp(/^https?:\/\//);

export const isCloudUrl = (cluster?: Cluster): boolean => {
  // enable cloud url for new clusters
  if (!cluster) {
    return true;
  }
  const { proxyAddress, serverName } = cluster;
  if (!proxyAddress && !serverName) {
    return true;
  }
  const portParts = (proxyAddress ?? '').split(':');
  const proxyAddressWithoutPort = portParts[0];
  const port = portParts[1];
  return port === CLOUD_DEFAULT_PROXY_PORT && proxyAddressWithoutPort === serverName;
};

const hasProtocol = (url: string): boolean => PROTOCOL_REGEX.test(url);
const formatUrl = (url: string) => {
  url = (url ?? '').trim().toLowerCase();
  // add protocol if missing to avoid URL constructor throwing error
  if (!hasProtocol(url)) {
    url = `${'http://'}${url}`;
  }
  return url;
};

export const convertProxyConnectionToCloudUrl = (cluster?: Cluster): string => {
  if (!isCloudUrl) {
    return '';
  }
  return cluster?.serverName ?? '';
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
    return { proxyAddress: `${hostname}:${CLOUD_DEFAULT_PROXY_PORT}`, serverName: hostname };
  } catch (err) {
    return EMPTY_PROXY_VALUES;
  }
};

export const validateCloudUrl = (cloudDeploymentUrl: string): JSX.Element | null => {
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
