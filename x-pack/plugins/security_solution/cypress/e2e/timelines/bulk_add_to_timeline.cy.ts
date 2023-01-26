/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import { SELECTED_ALERTS } from '../../screens/alerts';
import { SERVER_SIDE_EVENT_COUNT } from '../../screens/timeline';
import { selectAllAlerts, selectFirstPageAlerts } from '../../tasks/alerts';
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
import { ALERTS_URL, HOSTS_URL } from '../../urls/navigation';

const assertFirstPageEventsAddToTimeline = (type: 'alerts' | 'events') => {
  if (type === 'alerts') selectFirstPageAlerts();
  else selectFirstPageEvents();
  cy.get(SELECTED_ALERTS).then((sub) => {
    const alertCountText = sub.text();
    const alertCount = alertCountText.split(' ')[1];
    bulkInvestigateSelectedEventsInTimeline();
    cy.get('body').should('contain.text', `${alertCount} event IDs`);
    cy.get(SERVER_SIDE_EVENT_COUNT).should('contain.text', alertCount);
  });
};

const assertAllEventsAddToTimeline = (type: 'alerts' | 'events') => {
  if (type === 'alerts') selectAllAlerts();
  else selectAllEvents();
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
    });

    beforeEach(() => {
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
    });

    it('Adding multiple alerts to the timeline should be successful', () => {
      assertFirstPageEventsAddToTimeline('alerts');
    });

    it('When selected all alerts are selected should be successfull', () => {
      assertAllEventsAddToTimeline('alerts');
    });
  });

  context('Host -> Events Viewer', () => {
    beforeEach(() => {
      visit(HOSTS_URL);
      openEvents();
      waitsForEventsToBeLoaded();
    });

    it('Adding multiple events to the timeline should be successful', () => {
      assertFirstPageEventsAddToTimeline('events');
    });

    it('When selected all alerts are selected should be successfull', () => {
      assertAllEventsAddToTimeline('events');
    });
  });

  context('Host -> Sessions Viewer', () => {
    beforeEach(() => {
      visit(HOSTS_URL);
      openSessions();
      waitsForEventsToBeLoaded();
    });

    it('Adding multiple events to the timeline should be successful', () => {
      assertFirstPageEventsAddToTimeline('events');
    });

    it('When selected all events are selected should be successfull', () => {
      assertAllEventsAddToTimeline('events');
    });
  });
});
