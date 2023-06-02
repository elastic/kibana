/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { CONNECTORS_INDEX } from '../..';
import { Connector } from '../../../common/types/connectors';

export const putUpdateNative = async (
  client: IScopedClusterClient,
  connectorId: string,
  isNative: boolean
) => {
  const result = await client.asCurrentUser.update<Connector>({
    doc: {
      is_native: isNative,
    },
    id: connectorId,
    index: CONNECTORS_INDEX,
  });

  return result;
};
