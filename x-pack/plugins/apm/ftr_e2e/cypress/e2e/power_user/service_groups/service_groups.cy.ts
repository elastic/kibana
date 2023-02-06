/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import url from 'url';
import { synthtrace } from '../../../../synthtrace';
import { generateData } from './generate_data';

const start = Date.now() - 1000;
const end = Date.now();

const serviceGroupsHref = url.format({
  pathname: 'app/apm/service-groups',
  query: {
    rangeFrom: new Date(start).toISOString(),
    rangeTo: new Date(end).toISOString(),
  },
});

const deleteAllServiceGroups = () => {
  const kibanaUrl = Cypress.env('KIBANA_URL');
  cy.request({
    log: false,
    method: 'GET',
    url: `${kibanaUrl}/internal/apm/service-groups`,
    body: {},
    headers: {
      'kbn-xsrf': 'e2e_test',
    },
    auth: { user: 'editor', pass: 'changeme' },
  }).then((response) => {
    const promises = response.body.serviceGroups.map((item: any) => {
      if (item.id) {
        return cy.request({
          log: false,
          method: 'DELETE',
          url: `${kibanaUrl}/internal/apm/service-group?serviceGroupId=${item.id}`,
          headers: {
            'kbn-xsrf': 'e2e_test',
          },
          auth: { user: 'editor', pass: 'changeme' },
        });
      }
    });
    return Promise.all(promises);
  });
};

describe('Service groups', () => {
  before(() => {
    synthtrace.index(
      generateData({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(() => {
    synthtrace.clean();
  });

  describe('When navigating to service groups', () => {
    beforeEach(() => {
      cy.loginAsEditorUser();
      cy.visitKibana(serviceGroupsHref);
    });

    after(() => {
      deleteAllServiceGroups();
    });

    describe('when there are not service groups', () => {
      before(() => {
        deleteAllServiceGroups();
      });
      it('shows no service groups', () => {
        cy.contains('h2', 'No service groups');
      });

      it('creates a service group', () => {
        cy.getByTestSubj('apmCreateServiceGroupButton').click();
        cy.getByTestSubj('apmGroupNameInput').type('go services');
        cy.contains('Select services').click();
        cy.getByTestSubj('headerFilterKuerybar').type('agent.name:"go"{enter}');
        cy.contains('synth-go-1');
        cy.contains('synth-go-2');
        cy.contains('Save group').click();
      });
    });

    describe('when there are service groups', () => {
      it('shows service groups', () => {
        cy.contains('1 group');
        cy.getByTestSubj('serviceGroupCard')
          .should('contain', 'go services')
          .should('contain', '2 services');
      });
      it('opens service list when click in service group card', () => {
        cy.getByTestSubj('serviceGroupCard').click();
        cy.contains('go services');
        cy.contains('synth-go-1');
        cy.contains('synth-go-2');
      });
      it('deletes service group', () => {
        cy.getByTestSubj('serviceGroupCard').click();
        cy.get('button:contains(Edit group)').click();
        cy.getByTestSubj('apmDeleteGroupButton').click();
        cy.contains('h2', 'No service groups');
      });
    });
  });
});
