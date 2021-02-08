/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineId } from '../../../common/types/timeline';

export const detectionsTimelineIds = [
  TimelineId.detectionsPage,
  TimelineId.detectionsRulesDetailsPage,
];

export const skipQueryForDetectionsPage = (id: string, defaultIndex: string[]) =>
  id != null &&
  detectionsTimelineIds.some((timelineId) => timelineId === id) &&
  !defaultIndex.some((di) => di.toLowerCase().startsWith('.siem-signals'));
