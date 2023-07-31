/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ActionTypeConfig = Record<string, unknown>;

export interface ConnectorResponse<Config extends ActionTypeConfig = ActionTypeConfig> {
  id: string;
  name: string;
  config?: Config;
  connector_type_id: string;
  is_missing_secrets?: boolean;
  is_preconfigured: boolean;
  is_deprecated: boolean;
  is_system_action: boolean;
  referenced_by_count: number;
}
