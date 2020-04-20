/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Timeline } from './timeline';

export interface Case {
  name: string;
  tags: string[];
  description: string;
  timeline: Timeline;
  reporter: string;
}

const caseTimeline: Timeline = {
  title: 'SIEM test',
  description: 'description',
  query: 'host.name:*',
};

export const case1: Case = {
  name: 'This is the title of the case',
  tags: ['Tag1', 'Tag2'],
  description: 'This is the case description',
  timeline: caseTimeline,
  reporter: 'elastic',
};
