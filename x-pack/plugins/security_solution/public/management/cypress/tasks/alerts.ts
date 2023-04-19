/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Continuously check for any alert to have been received by the given endpoint
 */
export const waitForEndpointAlerts = (endpointAgentId: string) => {
  // 0. get a baseline - query the index that teh endpoint streams data to to get a current total
  //
  // 1. Check index that endpoint streams alerts to for new ones to show up
  //
  // 2. once received, stop/start Endpoint rule
  //
  // 3. wait until the Detection alert show up
};
