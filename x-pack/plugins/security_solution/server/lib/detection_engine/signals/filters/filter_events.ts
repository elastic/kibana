/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import { SignalSearchResponse } from '../types';
import { FilterEventsOptions } from './types';

/**
 * Check if for each tuple, the entry is not in both for when two or more value list entries exist.
 * @param events The events to check against
 * @param fieldAndSetTuples The field and set tuples
 */
export const filterEvents = ({
  events,
  fieldAndSetTuples,
}: FilterEventsOptions): SignalSearchResponse['hits']['hits'] => {
  return events.filter((item) => {
    return fieldAndSetTuples
      .map((tuple) => {
        const eventItem = get(tuple.field, item._source);
        if (eventItem == null) {
          return true;
        } else if (tuple.operator === 'included') {
          // only create a signal if the event is not in the value list
          return !tuple.matchedSet.has(eventItem);
        } else if (tuple.operator === 'excluded') {
          // only create a signal if the event is in the value list
          return tuple.matchedSet.has(eventItem);
        } else {
          return false;
        }
      })
      .some((value) => value);
  });
};
