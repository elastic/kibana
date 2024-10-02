/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorExecuteResponseV1 } from '../../../../../../common/routes/connector/response';
import { ActionTypeExecutorResult } from '../../../../../types';

export const transformExecuteConnectorResponse = ({
  actionId,
  serviceMessage,
  errorSource,
  retry,
  ...res
}: ActionTypeExecutorResult<unknown>): ConnectorExecuteResponseV1 => ({
  ...res,
  connector_id: actionId,
  ...(serviceMessage ? { service_message: serviceMessage } : {}),
  ...(errorSource ? { error_source: errorSource } : {}),
  ...(retry && typeof retry === 'object' ? { retry: retry.toISOString() } : {}),
});
