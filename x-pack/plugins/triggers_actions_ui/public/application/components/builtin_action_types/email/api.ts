/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../constants';
import { EmailConfig } from '../types';

export async function getServiceConfig({
  http,
  service,
}: {
  http: HttpSetup;
  service: string;
}): Promise<Partial<Pick<EmailConfig, 'host' | 'port' | 'secure'>>> {
  return await http.get(`${INTERNAL_BASE_ACTION_API_PATH}/connector/_email_config/${service}`);
}
