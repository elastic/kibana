/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esArchiverResetKibana } from './es_archiver';
import { LOADING_INDICATOR } from '../screens/security_header';

const primaryButton = 0;

/**
 * To overcome the React Beautiful DND sloppy click detection threshold:
 * https://github.com/atlassian/react-beautiful-dnd/blob/67b96c8d04f64af6b63ae1315f74fc02b5db032b/docs/sensors/mouse.md#sloppy-clicks-and-click-prevention-
 */
const dndSloppyClickDetectionThreshold = 5;

export const API_AUTH = Object.freeze({
  user: Cypress.env('ELASTICSEARCH_USERNAME'),
  pass: Cypress.env('ELASTICSEARCH_PASSWORD'),
});

export const API_HEADERS = Object.freeze({ 'kbn-xsrf': 'cypress' });

export const rootRequest = <T = unknown>(
  options: Partial<Cypress.RequestOptions>
): Cypress.Chainable<Cypress.Response<T>> =>
  cy.request<T>({
    auth: API_AUTH,
    headers: API_HEADERS,
    ...options,
  });

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

/** Drags the subject being dragged on the specified drop target, but does not drop it  */
export const dragWithoutDrop = (dropTarget: JQuery<HTMLElement>) => {
  cy.wrap(dropTarget).trigger('mousemove', 'center', {
    button: primaryButton,
  });
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

export const cleanKibana = () => {
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_\*`;

  rootRequest({
    method: 'POST',
    url: '/api/detection_engine/rules/_bulk_action',
    body: {
      query: '',
      action: 'delete',
    },
    failOnStatusCode: false,
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
    timeout: 300000,
  });

  rootRequest({
    method: 'POST',
    url: `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed`,
    body: {
      query: {
        bool: {
          filter: [
            {
              match: {
                type: 'alert',
              },
            },
            {
              match: {
                'alert.alertTypeId': 'siem.signals',
              },
            },
            {
              match: {
                'alert.consumer': 'siem',
              },
            },
          ],
        },
      },
    },
  });

  deleteCases();

  rootRequest({
    method: 'POST',
    url: `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed`,
    body: {
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
    },
  });

  rootRequest({
    method: 'POST',
    url: `${Cypress.env(
      'ELASTICSEARCH_URL'
    )}/.lists-*,.items-*,.siem-signals-*/_delete_by_query?conflicts=proceed&scroll_size=10000`,
    body: {
      query: {
        match_all: {},
      },
    },
  });

  esArchiverResetKibana();
};

export const deleteCases = () => {
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_\*`;
  rootRequest({
    method: 'POST',
    url: `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed`,
    body: {
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
    },
  });
};

export const scrollToBottom = () => cy.scrollTo('bottom');

export const waitForPageToBeLoaded = () => {
  cy.get(LOADING_INDICATOR).should('exist');
  cy.get(LOADING_INDICATOR).should('not.exist');
};
