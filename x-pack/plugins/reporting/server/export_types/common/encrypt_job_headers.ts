/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { ReportingCore } from '../..';
import { cryptoFactory } from '../../lib';

/*
 * Encrypts request headers for a report job payload
 */
export const encryptJobHeaders = async (
  reporting: ReportingCore,
  request: KibanaRequest,
  _logger: Logger
): Promise<string> => {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));

  const headers = { ...request.headers }; // TODO: Accept an optional API Key in this function, and apply it here as authorization

  return await crypto.encrypt(headers);
};
