/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionTypeExecutorResult,
  ActionTypeExecutorResultStatus,
} from '../../../../../actions/common';

interface SnakeCasedResponse<Data> {
  connector_id: string;
  status: ActionTypeExecutorResultStatus;
  message?: string;
  service_message?: string;
  data?: Data;
  retry?: null | boolean | Date;
}

export const rewriteResponseToCamelCase = <T>({
  connector_id,
  service_message,
  ...data
}: SnakeCasedResponse<T>): ActionTypeExecutorResult<T> => ({
  ...data,
  actionId: connector_id,
  serviceMessage: service_message,
});
