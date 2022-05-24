/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import {
  getTimelineSelector,
  globalFiltersQuerySelector,
  globalQuery,
  globalQuerySelector,
  timelineQueryByIdSelector,
} from '../../../store/inputs/selectors';
import { getTimelineByIdSelector } from '../../../../timelines/store/timeline/selectors';

/**
 * This selector is invoked with two arguments:
 * @param state - the state of the store as defined by State in common/store/types.ts
 * @param id - a timeline id e.g. `detections-page`
 *
 * Example:
 *  `useSelector((state: State) => eventsViewerSelector(state, id))`
 */
export const eventsViewerSelector = createSelector(
  globalFiltersQuerySelector(),
  getTimelineSelector(),
  globalQuerySelector(),
  globalQuery(),
  timelineQueryByIdSelector(),
  getTimelineByIdSelector(),
  (filters, input, query, globalQueries, timelineQuery, timeline) => ({
    /** an array representing filters added to the search bar */
    filters,
    /** an object containing the timerange set in the global date picker, and other page level state */
    input,
    /** a serialized representation of the KQL / Lucence query in the search bar */
    query,
    /** an array of objects with metadata and actions related to queries on the page */
    globalQueries,
    /** an object with metadata and actions related to the table query */
    timelineQuery,
    /** a specific timeline from the state's timelineById collection, or undefined */
    timeline,
  })
);
