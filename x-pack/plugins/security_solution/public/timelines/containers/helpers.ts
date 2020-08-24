/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import isEqual from 'lodash/isEqual';
import { TimelineId } from '../../../common/types/timeline';

export const detectionsTimelineIds = [
  TimelineId.detectionsPage,
  TimelineId.detectionsRulesDetailsPage,
];

/**
 * If the defaultIndex for timeline and the defaultKibana index are equal to each other
 * then this does not contain the signals index and we would want to exclude it completely from a query
 * while on the detections page or the detection details page. This is to prevent additional querying
 * from happening with the detections page and detections details when the default index is pushed into timeline.
 * This code is considered a workaround and should go away in the future after refactoring/rewrites of timeline.
 * @param id The id of the page which if it is set to the detections page or details page then it should not be analyzed
 * @param defaultIndex The default index that is about cause a query from timeline.
 * @param defaultKibanaIndex The default Kibana index to check to see if they're the same thing and if so, let us not query
 */
export const skipQueryForDetectionsPage = ({
  id,
  defaultIndex,
  defaultKibanaIndex,
}: {
  id: string;
  defaultIndex: string[];
  defaultKibanaIndex: string[];
}) =>
  detectionsTimelineIds.some((timelineId) => timelineId === id) &&
  isEqual(defaultIndex.sort(), defaultKibanaIndex.sort());
