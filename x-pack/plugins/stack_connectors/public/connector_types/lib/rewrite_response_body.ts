/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypeExecutorResult, RewriteResponseCase } from '@kbn/actions-plugin/common';

export type ConnectorExecutorResult<T> = ReturnType<
  RewriteResponseCase<ActionTypeExecutorResult<T>>
>;

export const rewriteResponseToCamelCase = <T>({
  connector_id: actionId,
  service_message: serviceMessage,
  ...data
}: ConnectorExecutorResult<T>): ActionTypeExecutorResult<T> => ({
  ...data,
  actionId,
  ...(serviceMessage && { serviceMessage }),
});
