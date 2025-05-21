/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationType } from './constants';

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  description: string;
  configuration: IntegrationConfiguration;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type IntegrationConfiguration = Record<string, any>;
