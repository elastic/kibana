/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VIZ_INSPECT_BUTTON } from '../screens/inspect';

export const clickVizActionsInspect = () => {
  cy.get(VIZ_INSPECT_BUTTON).click({ force: true });
};
