/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import { Index } from '../../../plugins/index_management/server';

export const rollupDataEnricher = async (indicesList: Index[], client: IScopedClusterClient) => {
  if (!indicesList || !indicesList.length) {
    return Promise.resolve(indicesList);
  }

  try {
    const rollupJobData = await client.asCurrentUser.rollup.getRollupIndexCaps({
      index: '_all',
    });

    return indicesList.map((index) => {
      const isRollupIndex = !!rollupJobData[index.name];
      return {
        ...index,
        isRollupIndex,
      };
    });
  } catch (e) {
    // swallow exceptions and return original list
    return indicesList;
  }
};
