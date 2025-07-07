/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPreConfiguredActions } from '../../alerting_api_integration/common/config';
import { getTlsWebhookServerUrls } from '../../alerting_api_integration/common/lib/get_tls_webhook_servers';

export const updateKbnServerArguments = async (kbnServerArgs: string[]) => {
  const tlsWebhookServers = await getTlsWebhookServerUrls(6300, 6399);
  const updatedArgs = kbnServerArgs.map((arg) =>
    arg.startsWith('--xpack.actions.preconfigured')
      ? `--xpack.actions.preconfigured=${getPreConfiguredActions(tlsWebhookServers)}`
      : arg
  );

  return updatedArgs;
};
