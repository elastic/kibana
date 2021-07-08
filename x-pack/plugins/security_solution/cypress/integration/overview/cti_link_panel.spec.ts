/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OVERVIEW_CTI_LINKS,
  OVERVIEW_CTI_LINKS_ERROR_INNER_PANEL,
  OVERVIEW_CTI_LINKS_INFO_INNER_PANEL,
  OVERVIEW_CTI_LINKS_WARNING_INNER_PANEL,
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
  });

  describe('enabled threat intel module', () => {
    before(() => {
      esArchiverLoad('threat_indicator');
    });

    after(() => {
      esArchiverUnload('threat_indicator');
    });

    it('renders warning inner panel if there are no events in the selected time period', () => {
      loginAndWaitForPage(
        `${OVERVIEW_URL}?sourcerer=(timerange:(from:%272021-07-08T04:00:00.000Z%27,kind:absolute,to:%272021-07-09T03:59:59.999Z%27))`
      );
      cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_WARNING_INNER_PANEL}`).should('exist');
    });

    it('does not render warning inner panel if there are events in the selected time period', () => {
      loginAndWaitForPage(OVERVIEW_URL);
      cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_WARNING_INNER_PANEL}`).should('not.exist');
    });

    it('renders info inner panel if there are no threat intel dashboards', () => {
      loginAndWaitForPage(OVERVIEW_URL);
      cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_INFO_INNER_PANEL}`).should('exist');
    });

    // TODO: find a way to properly load a 'threat intel' tag and a dashboard that has that tag for the test to work
    // it('does not render info inner panel if there are threat intel dashboards', () => {
    //   esArchiverLoad('cti_tag');
    //   loginAndWaitForPage(OVERVIEW_URL);
    //   cy.get(`${OVERVIEW_CTI_LINKS} ${OVERVIEW_CTI_LINKS_INFO_INNER_PANEL}`).should('not.exist');
    //   esArchiverUnload('cti_tag');
    // });
  });
});
