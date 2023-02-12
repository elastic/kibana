/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertConsumers } from '@kbn/rule-data-utils';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';

export interface Consumer {
  id: AlertConsumers;
  name: string;
}

export type ServerError = IHttpFetchError<ResponseErrorBody>;
