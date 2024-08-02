/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut } from '@elastic/eui';

export const ProxyWarning: React.FunctionComponent<{}> = () => (
  <EuiCallOut
    iconType="warning"
    color="warning"
    size="s"
    title={
      <FormattedMessage
        id="xpack.fleet.settings.proxyWarning.warningTitle"
        defaultMessage="Be aware that changing the proxy settings may cause Elastic Agents to lose connectivity. Please ensure that agents have reachability to the proxy in the context that it is being used for."
      />
    }
  />
);
