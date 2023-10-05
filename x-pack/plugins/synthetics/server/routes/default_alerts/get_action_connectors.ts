/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const getActionConnectorsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.GET_ACTIONS_CONNECTORS,
  validate: {},
  handler: async ({ context, server, savedObjectsClient }): Promise<any> => {
    const actionsClient = (await context.actions)?.getActionsClient();

    return actionsClient.getAll();
  },
});
