/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OVERVIEW_HOST_STATS, OVERVIEW_NETWORK_STATS } from '../screens/overview';

export const expand = (statType: string) => {
  cy.get(statType).find('button').invoke('click');
};

export const expandHostStats = () => {
  expand(OVERVIEW_HOST_STATS);
};

export const expandNetworkStats = () => {
  expand(OVERVIEW_NETWORK_STATS);
};
