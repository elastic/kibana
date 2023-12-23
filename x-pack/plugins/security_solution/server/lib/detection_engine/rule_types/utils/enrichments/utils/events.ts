/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { BaseFieldsLatest } from '../../../../../../../common/api/detection_engine/model/alerts';
import type { EventsForEnrichment, GetEventValue, GetFieldValue } from '../types';

export const getEventValue: GetEventValue = (event, path) => {
  const value = get(event, `_source.${path}`) || event?._source?.[path];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

export const getFieldValue: GetFieldValue = (event, path) => get(event?.fields, path)?.[0];

/** Given an eventField, returns a map of values found in that field to the events that contain that value. */
export function getEventsMapByFieldValue<T extends BaseFieldsLatest>(
  events: Array<EventsForEnrichment<T>>,
  eventField: string
): Record<
  /** values found in mappingField.eventField */ string,
  /** Array of events with the corresponding value */ typeof events
> {
  const eventsWithField = events.filter((event) => getEventValue(event, eventField));

  const eventsMapByFieldValue: Record<
    /** values found in mappingField.eventField */ string,
    /** Array of events with the corresponding value */ typeof events
  > = eventsWithField.reduce((acc, event) => {
    const eventFieldValue = getEventValue(event, eventField);

    if (!eventFieldValue) return {};

    acc[eventFieldValue] ??= [];
    acc[eventFieldValue].push(event);

    return acc;
  }, {} as { [key: string]: typeof events });

  return eventsMapByFieldValue;
}
