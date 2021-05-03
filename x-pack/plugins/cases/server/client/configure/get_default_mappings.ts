/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { ConnectorTypes, GetDefaultMappingsResponse } from '../../../common';
import { ConfigureFields } from '../types';
import { createDefaultMapping, mapSwimlaneFields, SwimlaneGetFieldsResponse } from './utils';
import { ActionResult } from '../../../../actions/server';

export const getDefaultMappings = async ({
  actionsClient,
  connectorType,
  connectorId,
}: ConfigureFields): Promise<GetDefaultMappingsResponse> => {
  let fields;
  if (connectorType === ConnectorTypes.swimlane) {
    const results: ActionResult<SwimlaneGetFieldsResponse> = await actionsClient.get({
      id: connectorId,
    });
    if (results.config && results.config.mappings) {
      fields = mapSwimlaneFields(results.config.mappings);
    } else {
      throw Boom.failedDependency('Something is wrong with the Swimlane connector field mappings.');
    }
  }
  return createDefaultMapping(connectorType, fields);
};
