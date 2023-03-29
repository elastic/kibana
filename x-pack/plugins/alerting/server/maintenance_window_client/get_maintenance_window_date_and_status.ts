/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { DateRange, MaintenanceWindowStatus } from '../../common';

export interface DateSearchResult {
  event: DateRange;
  index: number;
  status: MaintenanceWindowStatus;
}

export interface MaintenanceWindowDateAndStatus {
  startDate: string | null;
  endDate: string | null;
  status: MaintenanceWindowStatus;
}

// Returns the most recent/relevant event and the status for a maintenance window
export const getMaintenanceWindowDateAndStatus = ({
  events,
  dateToCompare,
  expirationDate,
}: {
  events: DateRange[];
  dateToCompare: Date;
  expirationDate: Date;
}): MaintenanceWindowDateAndStatus => {
  // No events, status is finished
  if (!events.length) {
    return {
      startDate: null,
      endDate: null,
      status: MaintenanceWindowStatus.Finished,
    };
  }

  const { event, status } = findRecentEventWithStatus(events, dateToCompare);
  // Past expiration, show the last event, but status is now archived
  if (moment(expirationDate).isBefore(dateToCompare)) {
    return {
      startDate: event.gte,
      endDate: event.lte,
      status: MaintenanceWindowStatus.Archived,
    };
  }

  return {
    startDate: event.gte,
    endDate: event.lte,
    status,
  };
};

// Binary date search to find the closest (or running) event relative to an arbitrary date
export const findRecentEventWithStatus = (
  events: DateRange[],
  dateToCompare: Date
): DateSearchResult => {
  const result = binaryDateSearch(events, dateToCompare, 0, events.length - 1)!;
  // Has running or upcoming event, just return the event
  if (
    result.status === MaintenanceWindowStatus.Running ||
    result.status === MaintenanceWindowStatus.Upcoming
  ) {
    return result;
  }
  // At the last event and it's finished, no more events are schedule so just return
  if (result.status === MaintenanceWindowStatus.Finished && result.index === events.length - 1) {
    return result;
  }
  return {
    event: events[result.index + 1],
    status: MaintenanceWindowStatus.Upcoming,
    index: result.index + 1,
  };
};

// Get the maintenance window status of any particular event relative to an arbitrary date
const getEventStatus = (event: DateRange, dateToCompare: Date): MaintenanceWindowStatus => {
  if (moment(event.gte).isAfter(dateToCompare)) {
    return MaintenanceWindowStatus.Upcoming;
  }
  if (moment(event.lte).isBefore(dateToCompare)) {
    return MaintenanceWindowStatus.Finished;
  }
  return MaintenanceWindowStatus.Running;
};

const binaryDateSearch = (
  events: DateRange[],
  dateToCompare: Date,
  startIndex: number,
  endIndex: number,
  lastIndex?: number
): DateSearchResult | undefined => {
  // Base case, take the last event it checked to see what the relative status to that event is
  if (startIndex > endIndex && typeof lastIndex === 'number') {
    const event = events[lastIndex];
    if (event) {
      return {
        event,
        status: getEventStatus(event, dateToCompare),
        index: lastIndex!,
      };
    }
  }

  const midIndex = startIndex + Math.floor((endIndex - startIndex) / 2);
  const midEvent = events[midIndex];
  const midEventStatus = getEventStatus(midEvent, dateToCompare);

  switch (midEventStatus) {
    case MaintenanceWindowStatus.Running:
      return {
        event: midEvent,
        status: MaintenanceWindowStatus.Running,
        index: midIndex,
      };
    case MaintenanceWindowStatus.Upcoming:
      return binaryDateSearch(events, dateToCompare, startIndex, midIndex - 1, midIndex);
    case MaintenanceWindowStatus.Finished:
      return binaryDateSearch(events, dateToCompare, midIndex + 1, endIndex, midIndex);
  }
};
