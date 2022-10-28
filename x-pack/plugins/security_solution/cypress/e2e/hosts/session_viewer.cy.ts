/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  investigateAllEventsInTimeline,
  investigateFirstPageEventsInTimeline,
} from '../../tasks/common/event_table';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { waitsForEventsToBeLoaded } from '../../tasks/hosts/events';
import { openSessions } from '../../tasks/hosts/main';
import { login, visit } from '../../tasks/login';
import { HOSTS_URL } from '../../urls/navigation';

describe('Bulk investigate in timeline', () => {
  before(() => {
    esArchiverLoad('bulk_process');
    login();
  });
  after(() => {
    esArchiverUnload('bulk_process');
  });

  beforeEach(() => {
    visit(HOSTS_URL);
    openSessions();
    waitsForEventsToBeLoaded();
  });

  it('Adding multiple events to the timeline should be successful', () => {
    // select all visible events
    investigateFirstPageEventsInTimeline();
  });

  it('When selected all events are selected, bulk action should be disabled', () => {
    investigateAllEventsInTimeline();
  });
});
