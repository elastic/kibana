/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { connectorResponseSchemaV1, connectorTypesResponseSchemaV1 } from '..';

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

type ConnectorTypesResponseSchemaType = TypeOf<typeof connectorTypesResponseSchemaV1>;
export interface ConnectorTypesResponse {
  id: ConnectorTypesResponseSchemaType['id'];
  name: ConnectorTypesResponseSchemaType['name'];
  enabled: ConnectorTypesResponseSchemaType['enabled'];
  enabled_in_config: ConnectorTypesResponseSchemaType['enabled_in_config'];
  enabled_in_license: ConnectorTypesResponseSchemaType['enabled_in_license'];
  minimum_license_required: ConnectorTypesResponseSchemaType['minimum_license_required'];
  supported_feature_ids: ConnectorTypesResponseSchemaType['supported_feature_ids'];
  is_system_action_type: ConnectorTypesResponseSchemaType['is_system_action_type'];
}
