/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationType, IntegrationConfiguration } from '@kbn/wci-common';
export type { Integration } from '@kbn/wci-common';

export interface IntegrationCreateRequest {
  id?: string;
  name: string;
  type: IntegrationType;
  description: string;
  configuration: IntegrationConfiguration;
}
