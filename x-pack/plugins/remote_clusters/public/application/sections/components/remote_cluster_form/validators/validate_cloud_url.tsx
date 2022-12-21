/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { Cluster } from '../../../../../../common/lib';
import { isAddressValid } from './validate_address';

export const i18nTexts = {
  urlEmpty: (
    <FormattedMessage
      id="xpack.remoteClusters.cloudDeploymentForm.urlRequiredError"
      defaultMessage="A url is required."
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

export const isCloudUrlEnabled = (cluster?: Cluster): boolean => {
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

const formatUrl = (url: string) => {
  url = (url ?? '').trim().toLowerCase();
  // delete http(s):// protocol string if any
  url = url.replace(PROTOCOL_REGEX, '');
  return url;
};

export const convertProxyConnectionToCloudUrl = (cluster?: Cluster): string => {
  if (!isCloudUrlEnabled(cluster)) {
    return '';
  }
  return cluster?.serverName ?? '';
};
export const convertCloudUrlToProxyConnection = (
  cloudUrl: string = ''
): { proxyAddress: string; serverName: string } => {
  cloudUrl = formatUrl(cloudUrl);
  if (!cloudUrl || !isAddressValid(cloudUrl)) {
    return EMPTY_PROXY_VALUES;
  }
  const address = cloudUrl.split(':')[0];
  return { proxyAddress: `${address}:${CLOUD_DEFAULT_PROXY_PORT}`, serverName: address };
};

export const validateCloudUrl = (cloudUrl: string): JSX.Element | null => {
  if (!cloudUrl) {
    return i18nTexts.urlEmpty;
  }
  cloudUrl = formatUrl(cloudUrl);
  if (!isAddressValid(cloudUrl)) {
    return i18nTexts.urlInvalid;
  }
  return null;
};
