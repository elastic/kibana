/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Timeline, TimelineWithId } from './timeline';

export interface TestCase {
  name: string;
  tags: string[];
  description: string;
  timeline: Timeline;
  reporter: string;
}

export interface Connector {
  connectorName: string;
  URL: string;
  username: string;
  password: string;
}

export const caseTimeline: TimelineWithId = {
  title: 'SIEM test',
  description: 'description',
  query: 'host.name:*',
  id: '0162c130-78be-11ea-9718-118a926974a4',
};

export const case1: TestCase = {
  name: 'This is the title of the case',
  tags: ['Tag1', 'Tag2'],
  description: 'This is the case description',
  timeline: caseTimeline,
  reporter: 'elastic',
};

export const serviceNowConnector: Connector = {
  connectorName: 'New connector',
  URL: 'https://www.test.service-now.com',
  username: 'Username Name',
  password: 'password',
};

export const TIMELINE_CASE_ID = '68248e00-f689-11ea-9ab2-59238b522856';
