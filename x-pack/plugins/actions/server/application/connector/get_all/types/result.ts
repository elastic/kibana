/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypeConfig } from '../../../../types';

export interface ConnectorResult<Config extends ActionTypeConfig = ActionTypeConfig> {
  id: string;
  actionTypeId: string;
  name: string;
  isMissingSecrets?: boolean;
  config?: Config;
  isPreconfigured: boolean;
  isDeprecated: boolean;
  isSystemAction: boolean;
}

export interface FindConnectorResult extends ConnectorResult {
  referencedByCount: number;
}
