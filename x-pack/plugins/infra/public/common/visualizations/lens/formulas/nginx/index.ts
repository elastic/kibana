/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requestRate } from './request_rate';
import { activeConnections } from './active_connections';
import { requestsPerConnection } from './requests_per_connection';
import { successStatusCodes } from './success_status_codes';
import { redirectStatusCodes } from './redirect_status_codes';
import { clientErrorStatusCodes } from './client_error_status_codes';
import { serverErrorStatusCodes } from './server_error_status_codes';

export const nginxLensFormulas = {
  activeConnections,
  requestRate,
  requestsPerConnection,
  successStatusCodes,
  redirectStatusCodes,
  clientErrorStatusCodes,
  serverErrorStatusCodes,
};
