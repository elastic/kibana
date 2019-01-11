/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getIndexManagementDataEnrichers } from '../../index_management_data';
export const enrichResponse = async (response, callWithRequest) => {
  let enrichedResponse = response;
  const dataEnrichers = getIndexManagementDataEnrichers();
  for (let i = 0; i < dataEnrichers.length; i++) {
    const dataEnricher = dataEnrichers[i];
    try {
      const dataEnricherResponse = await dataEnricher(enrichedResponse, callWithRequest);
      enrichedResponse = dataEnricherResponse;
    } catch(e) {
      // silently swallow enricher response errors
    }
  }
  return enrichedResponse;
};
