/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Index } from '../../../plugins/index_management/server';

export const rollupDataEnricher = async (indicesList: Index[], callWithRequest: any) => {
  if (!indicesList || !indicesList.length) {
    return Promise.resolve(indicesList);
  }

  const params = {
    path: '/_all/_rollup/data',
    method: 'GET',
  };

  try {
    const rollupJobData = await callWithRequest('transport.request', params);
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
