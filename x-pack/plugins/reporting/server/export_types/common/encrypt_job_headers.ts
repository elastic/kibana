/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import { ReportingCore } from '../..';
import { cryptoFactory, LevelLogger } from '../../lib';

/*
 * Encrypts request headers for a report job payload, so the job can authorize itself with Kibana when it is running
 * If req.body.api_key exists, the API Key will be used as the `authorize` header
 * Any other request header besides `authorization` will be preserved in the body of encrypted headers. [1]
 */
export const encryptJobHeaders = async (
  reporting: ReportingCore,
  request: KibanaRequest,
  _logger: LevelLogger
): Promise<string> => {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));

  const headers = { ...request.headers };

  return await crypto.encrypt(headers);
};
