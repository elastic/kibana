/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { synthtrace } from '../../../synthtrace';
import { opbeans } from '../../fixtures/synthtrace/opbeans';
import { checkA11y } from '../../support/commands';
import { generateManyDependencies } from './generate_many_dependencies';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const timeRange = {
  rangeFrom: start,
  rangeTo: end,
};

describe('Dependencies', () => {
  before(() => {
    synthtrace.index(
      opbeans({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(() => {
    synthtrace.clean();
  });

  beforeEach(() => {
    cy.loginAsViewerUser();
  });

  describe('top-level dependencies page', () => {
    it('has a list of dependencies and you can navigate to the page for one', () => {
      cy.visitKibana(`/app/apm/services?${new URLSearchParams(timeRange)}`);
      cy.contains('nav a', 'Dependencies').click();

      // `force: true` because Cypress says the element is 0x0
      cy.contains('postgresql').click({ force: true });

      cy.contains('h1', 'postgresql');
    });

    it('has no detectable a11y violations on load', () => {
      cy.visitKibana(
        `/app/apm/services/opbeans-java/dependencies?${new URLSearchParams(
          timeRange
        )}`
      );
      cy.contains('a[role="tab"]', 'Dependencies');
      // set skipFailures to true to not fail the test when there are accessibility failures
      checkA11y({ skipFailures: true });
    });
  });

  describe('dependency overview page', () => {
    it('shows dependency information and you can navigate to a page for an upstream service', () => {
      cy.visitKibana(
        `/app/apm/dependencies/overview?${new URLSearchParams({
          ...timeRange,
          dependencyName: 'postgresql',
        })}`
      );

      cy.getByTestSubj('latencyChart');
      cy.getByTestSubj('throughputChart');
      cy.getByTestSubj('errorRateChart');

      cy.contains('opbeans-java').click({ force: true });

      cy.contains('h1', 'opbeans-java');
    });

    it('has no detectable a11y violations on load', () => {
      cy.visitKibana(
        `/app/apm/dependencies/overview?${new URLSearchParams({
          ...timeRange,
          dependencyName: 'postgresql',
        })}`
      );
      cy.contains('h1', 'postgresql');
      // set skipFailures to true to not fail the test when there are accessibility failures
      checkA11y({ skipFailures: true });
    });
  });

  describe('service overview page', () => {
    it('shows dependency information and you can navigate to a page for a dependency', () => {
      cy.visitKibana(
        `/app/apm/services/opbeans-java/overview?${new URLSearchParams(
          timeRange
        )}`
      );

      cy.contains('a', 'postgresql').click({ force: true });

      cy.contains('h1', 'postgresql');
    });
  });

  describe('service dependencies tab', () => {
    it('shows dependency information and you can navigate to a page for a dependency', () => {
      cy.visitKibana(
        `/app/apm/services/opbeans-java/overview?${new URLSearchParams(
          timeRange
        )}`
      );

      cy.contains('a[role="tab"]', 'Dependencies').click();

      cy.contains('Time spent by dependency');

      cy.contains('a', 'postgresql').click({ force: true });

      cy.contains('h1', 'postgresql');
    });
  });
});

describe('Dependencies with high volume of data', () => {
  before(() => {
    synthtrace.index(
      generateManyDependencies({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(() => {
    synthtrace.clean();
  });

  beforeEach(() => {
    cy.loginAsViewerUser();
  });

  it('shows dependencies inventory page', () => {
    cy.visitKibana(
      `/app/apm/dependencies/inventory?${new URLSearchParams(timeRange)}`
    );

    cy.getByTestSubj('dependenciesTable');
    cy.contains('nav', 'Page 1 of 60');
  });

  it('shows service dependencies', () => {
    cy.visitKibana(
      `/app/apm/services/synth-java-0/dependencies?${new URLSearchParams({
        ...timeRange,
      })}`
    );

    cy.getByTestSubj('serviceDependenciesBreakdownChart').get('canvas');
    cy.getByTestSubj('dependenciesTable');
    cy.contains('nav', 'Page 1 of 100');
  });
});
