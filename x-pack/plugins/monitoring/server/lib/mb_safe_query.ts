/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mbSafeQuery = async (queryExecutor: () => Promise<any>) => {
  try {
    return await queryExecutor();
  } catch (err) {
    if (
      err.message.includes('no mapping found for') &&
      err.message.includes('in order to collapse on')
    ) {
      return {};
    }
    throw err;
  }
};
