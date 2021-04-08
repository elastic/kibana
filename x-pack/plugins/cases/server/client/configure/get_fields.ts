/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { PublicMethodsOf } from '@kbn/utility-types';
import { ActionsClient } from '../../../../actions/server';

import { GetFieldsResponse } from '../../../common/api';
import { createDefaultMapping, formatFields } from './utils';

interface ConfigurationGetFields {
  connectorId: string;
  connectorType: string;
  actionsClient: PublicMethodsOf<ActionsClient>;
}

export const getFields = async ({
  actionsClient,
  connectorType,
  connectorId,
}: ConfigurationGetFields): Promise<GetFieldsResponse> => {
  const results = await actionsClient.execute({
    actionId: connectorId,
    params: {
      subAction: 'getFields',
      subActionParams: {},
    },
  });
  if (results.status === 'error') {
    throw Boom.failedDependency(results.serviceMessage);
  }
  const fields = formatFields(results.data, connectorType);

  return { fields, defaultMappings: createDefaultMapping(fields, connectorType) };
};
