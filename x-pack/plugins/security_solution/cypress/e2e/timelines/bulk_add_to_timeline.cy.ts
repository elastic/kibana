/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import { SELECTED_ALERTS } from '../../screens/alerts';
import { SERVER_SIDE_EVENT_COUNT } from '../../screens/timeline';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import {
  bulkInvestigateSelectedEventsInTimeline,
  selectAllEvents,
  selectFirstPageEvents,
} from '../../tasks/common/event_table';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { waitsForEventsToBeLoaded } from '../../tasks/hosts/events';
import { openEvents, openSessions } from '../../tasks/hosts/main';
import { login, visit } from '../../tasks/login';
import { closeTimelineUsingCloseButton } from '../../tasks/security_main';
import { ALERTS_URL, HOSTS_URL } from '../../urls/navigation';

const assertFirstPageEventsAddToTimeline = () => {
  selectFirstPageEvents();
  cy.get(SELECTED_ALERTS).then((sub) => {
    const alertCountText = sub.text();
    const alertCount = alertCountText.split(' ')[1];
    bulkInvestigateSelectedEventsInTimeline();
    cy.get('body').should('contain.text', `${alertCount} event IDs`);
    cy.get(SERVER_SIDE_EVENT_COUNT).should('contain.text', alertCount);
  });
};

const assertAllEventsAddToTimeline = () => {
  selectAllEvents();
  cy.get(SELECTED_ALERTS).then((sub) => {
    const alertCountText = sub.text(); // Selected 3,654 alerts
    const alertCount = alertCountText.split(' ')[1];
    bulkInvestigateSelectedEventsInTimeline();
    cy.get('body').should('contain.text', `${alertCount} event IDs`);
    cy.get(SERVER_SIDE_EVENT_COUNT).should('contain.text', alertCount);
  });
};

describe('Bulk Investigate in Timeline', () => {
  before(() => {
    cleanKibana();
    esArchiverLoad('bulk_process');
    login();
  });

  after(() => {
    esArchiverUnload('bulk_process');
  });

  context('Alerts', () => {
    before(() => {
      createCustomRuleEnabled(getNewRule());
      visit(ALERTS_URL);
    });
    beforeEach(() => {
      waitForAlertsToPopulate();
    });

    afterEach(() => {
      closeTimelineUsingCloseButton();
    });

    it('Adding multiple alerts to the timeline should be successful', () => {
      assertFirstPageEventsAddToTimeline();
    });

    it('When selected all alerts are selected should be successfull', () => {
      assertAllEventsAddToTimeline();
    });
  });

  context('Host -> Events Viewer', () => {
    before(() => {
      visit(HOSTS_URL);
      openEvents();
      waitsForEventsToBeLoaded();
    });

    afterEach(() => {
      closeTimelineUsingCloseButton();
    });

    it('Adding multiple alerts to the timeline should be successful', () => {
      assertFirstPageEventsAddToTimeline();
    });

    it('When selected all alerts are selected should be successfull', () => {
      assertAllEventsAddToTimeline();
    });
  });

  context('Host -> Sessions Viewer', () => {
    before(() => {
      visit(HOSTS_URL);
      openSessions();
      waitsForEventsToBeLoaded();
    });

    afterEach(() => {
      closeTimelineUsingCloseButton();
    });

    it('Adding multiple alerts to the timeline should be successful', () => {
      assertFirstPageEventsAddToTimeline();
    });

    it('When selected all alerts are selected should be successfull', () => {
      assertAllEventsAddToTimeline();
    });
  });
});
