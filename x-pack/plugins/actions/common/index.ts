/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110895
/* eslint-disable @kbn/eslint/no_export_all */

export * from './types';
export * from './alert_history_schema';
export * from './rewrite_request_case';

export const BASE_ACTION_API_PATH = '/api/actions';
export const INTERNAL_BASE_ACTION_API_PATH = '/internal/actions';
export const ACTIONS_FEATURE_ID = 'actions';

// supported values for `service` in addition to nodemailer's list of well-known services
export enum AdditionalEmailServices {
  ELASTIC_CLOUD = 'elastic_cloud',
  EXCHANGE = 'exchange_server',
  OTHER = 'other',
}
