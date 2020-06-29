/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import icalendar from 'icalendar';
import moment from 'moment';
import { generateTempId } from '../utils';

function createEvents(ical) {
  const events = ical.events();
  const mlEvents = [];

  events.forEach((e) => {
    if (e.element === 'VEVENT') {
      const description = e.properties.SUMMARY;
      const start = e.properties.DTSTART;
      const end = e.properties.DTEND;
      const recurring = e.properties.RRULE !== undefined;

      if (description && start && end && description.length && start.length && end.length) {
        // Temp reference to unsaved events to allow removal from table
        const tempId = generateTempId();

        mlEvents.push({
          event_id: tempId,
          description: description[0].value,
          start_time: start[0].value.valueOf(),
          end_time: end[0].value.valueOf(),
          asterisk: recurring,
        });
      }
    }
  });
  return mlEvents;
}

export function filterEvents(events) {
  const now = moment().valueOf();
  return events.filter((e) => e.start_time > now);
}

export function parseICSFile(data) {
  const cal = icalendar.parse_calendar(data);
  return createEvents(cal);
}

export function readFile(file) {
  return new Promise((resolve, reject) => {
    if (file && file.size) {
      const reader = new FileReader();
      reader.readAsText(file);

      reader.onload = (() => {
        return () => {
          const data = reader.result;
          if (data === '') {
            reject();
          } else {
            resolve({ data });
          }
        };
      })(file);
    } else {
      reject();
    }
  });
}
