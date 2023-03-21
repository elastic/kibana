/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOADING_INDICATOR } from '../screens/security_header';

const primaryButton = 0;

/**
 * To overcome the React Beautiful DND sloppy click detection threshold:
 * https://github.com/atlassian/react-beautiful-dnd/blob/67b96c8d04f64af6b63ae1315f74fc02b5db032b/docs/sensors/mouse.md#sloppy-clicks-and-click-prevention-
 */
const dndSloppyClickDetectionThreshold = 5;

/** Starts dragging the subject */
export const drag = (subject: JQuery<HTMLElement>) => {
  const subjectLocation = subject[0].getBoundingClientRect();

  cy.wrap(subject)
    .trigger('mousedown', {
      button: primaryButton,
      clientX: subjectLocation.left,
      clientY: subjectLocation.top,
      force: true,
    })
    .wait(300)
    .trigger('mousemove', {
      button: primaryButton,
      clientX: subjectLocation.left + dndSloppyClickDetectionThreshold,
      clientY: subjectLocation.top,
      force: true,
    })
    .wait(300);
};

/** "Drops" the subject being dragged on the specified drop target  */
export const drop = (dropTarget: JQuery<HTMLElement>) => {
  const targetLocation = dropTarget[0].getBoundingClientRect();
  cy.wrap(dropTarget)
    .trigger('mousemove', {
      button: primaryButton,
      clientX: targetLocation.left,
      clientY: targetLocation.top,
      force: true,
    })
    .wait(300)
    .trigger('mouseup', { force: true })
    .wait(300);
};

export const reload = () => {
  cy.reload();
  cy.contains('a', 'Security');
};

const clearSessionStorage = () => {
  cy.window().then((win) => {
    win.sessionStorage.clear();
  });
};

/** Clears the rules and monitoring tables state. Automatically called in `cleanKibana()`. */
export const resetRulesTableState = () => {
  clearSessionStorage();
};

export const cleanKibana = () => {
  resetRulesTableState();
  deleteAlertsAndRules();
  deleteCases();
  deleteTimelines();
};

export const deleteAlertsAndRules = () => {
  cy.log('Delete all alerts and rules');
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_\*`;

  cy.request({
    method: 'POST',
    url: '/api/detection_engine/rules/_bulk_action',
    body: {
      query: '',
      action: 'delete',
    },
    failOnStatusCode: false,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    timeout: 300000,
  });

  cy.request('POST', `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed`, {
    query: {
      bool: {
        filter: [
          {
            match: {
              type: 'alert',
            },
          },
        ],
      },
    },
  });

  cy.request(
    'POST',
    `${Cypress.env(
      'ELASTICSEARCH_URL'
    )}/.lists-*,.items-*,.alerts-security.alerts-*/_delete_by_query?conflicts=proceed&scroll_size=10000`,
    {
      query: {
        match_all: {},
      },
    }
  );
};

export const deleteTimelines = () => {
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_\*`;
  cy.request('POST', `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed`, {
    query: {
      bool: {
        filter: [
          {
            match: {
              type: 'siem-ui-timeline',
            },
          },
        ],
      },
    },
  });
};

export const deleteCases = () => {
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_\*`;
  cy.request('POST', `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed`, {
    query: {
      bool: {
        filter: [
          {
            match: {
              type: 'cases',
            },
          },
        ],
      },
    },
  });
};

export const deleteConnectors = () => {
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_\*`;
  cy.request('POST', `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed`, {
    query: {
      bool: {
        filter: [
          {
            match: {
              type: 'action',
            },
          },
        ],
      },
    },
  });
};

export const postDataView = (dataSource: string) => {
  cy.request({
    method: 'POST',
    url: `/api/index_patterns/index_pattern`,
    body: {
      index_pattern: {
        id: dataSource,
        fieldAttrs: '{}',
        title: dataSource,
        timeFieldName: '@timestamp',
        fields: '{}',
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
  });
};

export const deleteDataView = (dataSource: string) => {
  cy.request({
    method: 'DELETE',
    url: `api/data_views/data_view/${dataSource}`,
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });
};

export const scrollToBottom = () => cy.scrollTo('bottom');

export const waitForPageToBeLoaded = () => {
  cy.get(LOADING_INDICATOR).should('exist');
  cy.get(LOADING_INDICATOR).should('not.exist');
};
