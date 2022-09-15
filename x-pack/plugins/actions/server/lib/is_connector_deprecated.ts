/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import { PreConfiguredAction, RawAction } from '../types';

export type ConnectorWithOptionalDeprecation = Omit<PreConfiguredAction, 'isDeprecated'> &
  Pick<Partial<PreConfiguredAction>, 'isDeprecated'>;

const isObject = (obj: unknown): obj is Record<string, unknown> => isPlainObject(obj);

export const isConnectorDeprecated = (
  connector: RawAction | ConnectorWithOptionalDeprecation
): boolean => {
  if (connector.actionTypeId === '.servicenow' || connector.actionTypeId === '.servicenow-sir') {
    /**
     * Connectors after the Elastic ServiceNow application use the
     * Import Set API (https://developer.servicenow.com/dev.do#!/reference/api/rome/rest/c_ImportSetAPI)
     * A ServiceNow connector is considered deprecated if it uses the Table API.
     */

    /**
     * We cannot deduct if the connector is
     * deprecated without config. In this case
     * we always return false.
     */
    if (!isObject(connector.config)) {
      return false;
    }

    /**
     * If the usesTableApi is not defined it means that the connector is created
     * before the introduction of the usesTableApi property. In that case, the connector is assumed
     * to be deprecated because all connectors prior 7.16 where using the Table API.
     * Migrations x-pack/plugins/actions/server/saved_objects/actions_migrations.ts set
     * the usesTableApi property to true to all connectors prior 7.16. Pre configured connectors
     * cannot be migrated. This check ensures that pre configured connectors without the
     * usesTableApi property explicitly in the kibana.yml file are considered deprecated.
     * According to the schema defined here x-pack/plugins/stack_connector/server/connector_types/servicenow/schema.ts
     * if the property is not defined it will be set to true at the execution of the connector.
     */
    if (!Object.hasOwn(connector.config, 'usesTableApi')) {
      return true;
    }

    /**
     * Connector created prior to 7.16 will be migrated to have the usesTableApi property set to true.
     * Connectors created after 7.16 should have the usesTableApi property set to true or false.
     * If the usesTableApi is omitted on an API call it will be defaulted to true. Check the schema
     * here x-pack/plugins/stack_connector/server/connector_types/servicenow/schema.ts.
     * The !! is to make TS happy.
     */
    return !!connector.config.usesTableApi;
  }

  return false;
};
