/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { isAddressValid, isPortValid } from './validate_address';

export function validateProxy(proxy?: string): null | JSX.Element {
  if (!proxy) {
    return (
      <FormattedMessage
        id="xpack.remoteClusters.remoteClusterForm.proxyError.missingProxyMessage"
        defaultMessage="A proxy address is required."
      />
    );
  }

  const isValid = isAddressValid(proxy);

  if (!isValid) {
    return (
      <FormattedMessage
        id="xpack.remoteClusters.remoteClusterForm.proxyError.invalidCharactersMessage"
        defaultMessage="Address must use host:port format. Example: 127.0.0.1:9400, localhost:9400.
          Hosts can only consist of letters, numbers, and dashes."
      />
    );
  }

  if (!isPortValid(proxy)) {
    return (
      <FormattedMessage
        id="xpack.remoteClusters.remoteClusterForm.addressError.invalidPortMessage"
        defaultMessage="A port is required."
      />
    );
  }

  return null;
}
