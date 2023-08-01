/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { connectorResponseSchemaV1 } from '..';

export type ActionTypeConfig = Record<string, unknown>;
type ConnectorResponseSchemaType = TypeOf<typeof connectorResponseSchemaV1>;

export interface ConnectorResponse<Config extends ActionTypeConfig = ActionTypeConfig> {
  id: ConnectorResponseSchemaType['id'];
  name: ConnectorResponseSchemaType['name'];
  config?: Config;
  connector_type_id: ConnectorResponseSchemaType['connector_type_id'];
  is_missing_secrets?: ConnectorResponseSchemaType['is_missing_secrets'];
  is_preconfigured: ConnectorResponseSchemaType['is_preconfigured'];
  is_deprecated: ConnectorResponseSchemaType['is_deprecated'];
  is_system_action: ConnectorResponseSchemaType['is_system_action'];
  referenced_by_count: ConnectorResponseSchemaType['referenced_by_count'];
}
