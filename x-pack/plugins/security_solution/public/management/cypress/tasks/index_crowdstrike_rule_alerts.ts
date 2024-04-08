/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndexedCrowdstrikeRuleAlerts,
  DeletedIndexedCrowdstrikeRuleAlerts,
} from '../../../../common/endpoint/data_loaders/index_crowdstrike_rule_alerts';

export const indexCrowdstrikeRuleAlerts = (options: {
  count: number;
}): Cypress.Chainable<
  Pick<IndexedCrowdstrikeRuleAlerts, 'alerts'> & {
    cleanup: () => Cypress.Chainable<DeletedIndexedCrowdstrikeRuleAlerts>;
  }
> => {
  // ts-expect-error figure out what's wrong
  return cy.task('indexCrowdstrikeRuleAlerts', options).then((alerts) => {
    return {
      alerts,
      cleanup: () => {
        return cy.task('deleteIndexedCrowdstrikeRuleAlerts', alerts);
      },
    };
  });
};
