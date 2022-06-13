/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { QueryEventsBySavedObjectResult, IValidatedEvent } from '../../../event_log/server';

const EXECUTION_UUID_FIELD = 'kibana.alert.rule.execution.uuid';
const TIMESTAMP_FIELD = '@timestamp';
const PROVIDER_FIELD = 'event.provider';
const MESSAGE_FIELD = 'message';
const ERROR_MESSAGE_FIELD = 'error.message';

export interface IExecutionErrors {
  id: string;
  timestamp: string;
  type: string;
  message: string;
}

export interface IExecutionErrorsResult {
  totalErrors: number;
  errors: IExecutionErrors[];
}

export const EMPTY_EXECUTION_ERRORS_RESULT = {
  totalErrors: 0,
  errors: [],
};

function formatEvent(event: IValidatedEvent): IExecutionErrors {
  const message = get(event, MESSAGE_FIELD, '');
  const errorMessage = get(event, ERROR_MESSAGE_FIELD, null);
  return {
    id: get(event, EXECUTION_UUID_FIELD, ''),
    timestamp: get(event, TIMESTAMP_FIELD, ''),
    type: get(event, PROVIDER_FIELD, ''),
    message: errorMessage ? `${message} - ${errorMessage}` : message,
  };
}

export function formatExecutionErrorsResult(
  results: QueryEventsBySavedObjectResult
): IExecutionErrorsResult {
  const { total, data } = results;

  if (!data) {
    return EMPTY_EXECUTION_ERRORS_RESULT;
  }

  return {
    totalErrors: total,
    errors: data.map((event: IValidatedEvent) => formatEvent(event)),
  };
}
