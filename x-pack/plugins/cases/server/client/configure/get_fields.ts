/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { GetFieldsResponse } from '../../../common';
import { ConfigureFields } from '../types';
import { createDefaultMapping, formatFields } from './utils';

export const getFields = async ({
  actionsClient,
  connectorType,
  connectorId,
}: ConfigureFields): Promise<GetFieldsResponse> => {
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
