/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OVERVIEW_CTI_ENABLE_MODULE_BUTTON,
  OVERVIEW_CTI_LINKS,
  OVERVIEW_CTI_LINKS_ERROR_INNER_PANEL,
  OVERVIEW_CTI_LINKS_INFO_INNER_PANEL,
  OVERVIEW_CTI_LINKS_WARNING_INNER_PANEL,
  OVERVIEW_CTI_TOTAL_EVENT_COUNT,
  OVERVIEW_CTI_VIEW_DASHBOARD_BUTTON,
} from '../../screens/overview';

import { loginAndWaitForPage } from '../../tasks/login';
import { OVERVIEW_URL } from '../../urls/navigation';
import { cleanKibana } from '../../tasks/common';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';

describe('CTI Link Panel', () => {
  before(() => {
    cleanKibana();
  });

  describe('disabled threat intel module', () => {
    it('renders error inner panel', () => {
      loginAndWaitForPage(OVERVIEW_URL);
      cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_ERROR_INNER_PANEL}`).should('exist');
    });

    it('renders disabled "view dashboard" button', () => {
      cy.get(`${OVERVIEW_CTI_VIEW_DASHBOARD_BUTTON}`).should('be.disabled');
    });

    it('renders 0 total event count', () => {
      cy.get(`${OVERVIEW_CTI_TOTAL_EVENT_COUNT}`).should('have.text', 'Showing: 0 events');
    });

    it('renders enable module button', () => {
      it('renders disabled "view dashboard" button', () => {
        cy.get(`${OVERVIEW_CTI_ENABLE_MODULE_BUTTON}`).should('exist');
        // TODO: how to test injected doclink?
        // cy.get(`${OVERVIEW_CTI_ENABLE_MODULE_BUTTON} a`).should('have.attr', 'href', "doclink");
      });
    });
  });

  describe('enabled threat intel module', () => {
    before(() => {
      esArchiverLoad('threat_indicator');
    });

    after(() => {
      esArchiverUnload('threat_indicator');
    });

    describe('disabled dashboard module', () => {
      describe('when there are no events in the selected time period', () => {
        before(() => {
          loginAndWaitForPage(
            `${OVERVIEW_URL}?sourcerer=(timerange:(from:%272021-07-08T04:00:00.000Z%27,kind:absolute,to:%272021-07-09T03:59:59.999Z%27))`
          );
        });

        it('renders warning inner panel', () => {
          cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_WARNING_INNER_PANEL}`).should('exist');
        });

        it('renders info inner panel', () => {
          cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_INFO_INNER_PANEL}`).should('exist');
        });

        it('renders disabled "view dashboard" button', () => {
          cy.get(`${OVERVIEW_CTI_VIEW_DASHBOARD_BUTTON}`).should('be.disabled');
        });

        it('renders 0 total event count', () => {
          cy.get(`${OVERVIEW_CTI_TOTAL_EVENT_COUNT}`).should('have.text', 'Showing: 0 events');
        });
      });

      describe('when there are events in the selected time period', () => {
        before(() => {
          loginAndWaitForPage(OVERVIEW_URL);
        });

        it('does not render warning inner panel', () => {
          cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_WARNING_INNER_PANEL}`).should(
            'not.exist'
          );
        });

        it('renders info inner panel', () => {
          cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_INFO_INNER_PANEL}`).should('exist');
        });

        it('renders disabled "view dashboard" button', () => {
          cy.get(`${OVERVIEW_CTI_VIEW_DASHBOARD_BUTTON}`).should('be.disabled');
        });

        it('renders correct total event count', () => {
          cy.get(`${OVERVIEW_CTI_TOTAL_EVENT_COUNT}`).should('have.text', 'Showing: 1 event');
        });
      });
    });

    // TODO: find a way to properly load a 'threat intel' tag, and a dashboard that has that tag, for the following tests to work
    //
    // describe('enabled dashboard module', () => {
    //   before(() => {
    //     esArchiverLoad('cti_tag');
    //   });
    //
    //   after(() => {
    //     esArchiverUnload('cti_tag');
    //   });
    //
    //   describe('when there are no events in the selected time period', () => {
    //     before(() => {
    //       loginAndWaitForPage(
    //         `${OVERVIEW_URL}?sourcerer=(timerange:(from:%272021-07-08T04:00:00.000Z%27,kind:absolute,to:%272021-07-09T03:59:59.999Z%27))`
    //       );
    //     });
    //
    //     it('renders warning inner panel', () => {
    //       cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_WARNING_INNER_PANEL}`).should('exist');
    //     });
    //
    //     it('does not render info inner panel', () => {
    //       cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_INFO_INNER_PANEL}`).should(
    //         'not.exist'
    //       );
    //     });
    //
    //     it('renders enabled "view dashboard" button', () => {
    //       cy.get(`${OVERVIEW_CTI_VIEW_DASHBOARD_BUTTON}`).should('be.enabled');
    //     });
    //
    //     it('renders 0 total event count', () => {
    //       cy.get(`${OVERVIEW_CTI_TOTAL_EVENT_COUNT}`).should('have.text', 'Showing: 0 events');
    //     });
    //   });
    //
    //   describe('when there are events in the selected time period', () => {
    //     it('does not render warning inner panel', () => {
    //       cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_WARNING_INNER_PANEL}`).should(
    //         'not.exist'
    //       );
    //     });
    //
    //     it('does not render info inner panel', () => {
    //       cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_INFO_INNER_PANEL}`).should(
    //         'not.exist'
    //       );
    //     });
    //
    //     it('renders enabled "view dashboard" button', () => {
    //       cy.get(`${OVERVIEW_CTI_VIEW_DASHBOARD_BUTTON}`).should('be.enabled');
    //     });
    //
    //     it('renders correct total event count', () => {
    //       cy.get(`${OVERVIEW_CTI_TOTAL_EVENT_COUNT}`).should('have.text', 'Showing: 1 event');
    //     });
    //   });
    // });
  });
});
