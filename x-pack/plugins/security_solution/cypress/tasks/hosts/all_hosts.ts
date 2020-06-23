/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALL_HOSTS_TABLE, HOSTS_NAMES_DRAGGABLE, HOSTS_NAMES } from '../../screens/hosts/all_hosts';
import { TIMELINE_DATA_PROVIDERS, TIMELINE_DATA_PROVIDERS_EMPTY } from '../../screens/timeline';

import { drag, dragWithoutDrop, drop } from '../../tasks/common';

export const dragAndDropFirstHostToTimeline = () => {
  cy.get(HOSTS_NAMES_DRAGGABLE)
    .first()
    .then((firstHost) => drag(firstHost));
  cy.get(TIMELINE_DATA_PROVIDERS).then((dataProvidersDropArea) => drop(dataProvidersDropArea));
};

export const dragFirstHostToEmptyTimelineDataProviders = () => {
  cy.get(HOSTS_NAMES_DRAGGABLE)
    .first()
    .then((host) => drag(host));

  cy.get(TIMELINE_DATA_PROVIDERS_EMPTY).then((dataProvidersDropArea) =>
    dragWithoutDrop(dataProvidersDropArea)
  );
};

export const dragFirstHostToTimeline = () => {
  cy.get(HOSTS_NAMES_DRAGGABLE)
    .first()
    .then((host) => drag(host));
};
export const openFirstHostDetails = () => {
  cy.get(HOSTS_NAMES).first().click({ force: true });
};

export const waitForAllHostsToBeLoaded = () => {
  cy.get(ALL_HOSTS_TABLE).should('exist');
};
