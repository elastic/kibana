/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getIndexManagementDataEnrichers } from '../../index_management_data';
export const enrichResponse = async (response, callWithRequest) => {
  const dataEnrichers = getIndexManagementDataEnrichers();
  for (let i = 0; i < dataEnrichers.length; i++) {
    const dataEnricher = dataEnrichers[i];
    response = await dataEnricher(response, callWithRequest);
  }
  return response;
};