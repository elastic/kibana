/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esArchiverResetKibana } from './es_archiver';

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
  cy.request('POST', `${kibanaIndexUrl}/_delete_by_query?conflicts=proceed`, {
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
  });

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

  cy.request(
    'POST',
    `${Cypress.env(
      'ELASTICSEARCH_URL'
    )}/.lists-*,.items-*,.siem-signals-*/_delete_by_query?conflicts=proceed&scroll_size=10000`,
    {
      query: {
        match_all: {},
      },
    }
  );

  esArchiverResetKibana();
};
