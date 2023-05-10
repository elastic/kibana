/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIntegrationsClientMock } from './integrations_client.mock';
import { IntegrationsServiceStart } from './types';

export const createIntegrationsServiceStartMock = () => ({
  client: createIntegrationsClientMock(),
});

export const _ensureTypeCompatibility = (): IntegrationsServiceStart =>
  createIntegrationsServiceStartMock();
