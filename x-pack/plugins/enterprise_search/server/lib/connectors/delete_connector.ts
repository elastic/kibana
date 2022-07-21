/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';

export const deleteConnectorById = async (client: IScopedClusterClient, id: string) => {
  return await client.asCurrentUser.delete({ id, index: CONNECTORS_INDEX });
};
