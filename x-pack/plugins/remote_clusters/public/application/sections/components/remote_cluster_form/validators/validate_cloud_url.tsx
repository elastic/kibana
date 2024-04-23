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
      id="xpack.remoteClusters.cloudDeploymentForm.remoteAddressRequiredError"
      defaultMessage="A remote address is required."
    />
  ),
  urlInvalid: (
    <FormattedMessage
      id="xpack.remoteClusters.cloudDeploymentForm.remoteAddressInvalidError"
      defaultMessage="Remote address is invalid."
    />
  ),
};

const CLOUD_DEFAULT_PROXY_PORT = '9400';
const EMPTY_PROXY_VALUES = { proxyAddress: '', serverName: '' };
const PROTOCOL_REGEX = new RegExp(/^https?:\/\//);
const DEFAULT_SOCKET_CONNECTIONS = 18;

export const isCloudAdvancedOptionsEnabled = (cluster?: Cluster): boolean => {
  // The toggle is switched off by default
  if (!cluster) {
    return false;
  }
  const { proxyAddress, serverName, proxySocketConnections } = cluster;
  if (!proxyAddress) {
    return false;
  }
  const proxyAddressWithoutPort = (proxyAddress ?? '').split(':')[0];
  return (
    proxyAddressWithoutPort !== serverName ||
    (proxySocketConnections != null && proxySocketConnections !== DEFAULT_SOCKET_CONNECTIONS)
  );
};

const formatUrl = (url: string) => {
  url = (url ?? '').trim().toLowerCase();
  // delete http(s):// protocol string if any
  url = url.replace(PROTOCOL_REGEX, '');
  return url;
};

export const convertCloudRemoteAddressToProxyConnection = (url: string) => {
  url = formatUrl(url);
  if (!url || !isAddressValid(url)) {
    return EMPTY_PROXY_VALUES;
  }
  const host = url.split(':')[0];
  const port = url.split(':')[1];
  const proxyAddress = port ? url : `${host}:${CLOUD_DEFAULT_PROXY_PORT}`;
  return { proxyAddress, serverName: host };
};

export const validateCloudRemoteAddress = (url?: string): JSX.Element | null => {
  if (!url) {
    return i18nTexts.urlEmpty;
  }
  url = formatUrl(url);
  if (!isAddressValid(url)) {
    return i18nTexts.urlInvalid;
  }
  return null;
};
