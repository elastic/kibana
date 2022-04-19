/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PreConfiguredAction, RawAction } from '../types';

export type ConnectorWithOptionalDeprecation = Omit<PreConfiguredAction, 'isDeprecated'> &
  Pick<Partial<PreConfiguredAction>, 'isDeprecated'>;

export const isConnectorDeprecated = (
  connector: RawAction | ConnectorWithOptionalDeprecation
): boolean => {
  if (connector.actionTypeId === '.servicenow' || connector.actionTypeId === '.servicenow-sir') {
    /**
     * Connectors after the Elastic ServiceNow application use the
     * Import Set API (https://developer.servicenow.com/dev.do#!/reference/api/rome/rest/c_ImportSetAPI)
     * A ServiceNow connector is considered deprecated if it uses the Table API.
     *
     * All other connectors do not have the usesTableApi config property
     * so the function will always return false for them.
     */
    return !!connector.config?.usesTableApi;
  }

  return false;
};
