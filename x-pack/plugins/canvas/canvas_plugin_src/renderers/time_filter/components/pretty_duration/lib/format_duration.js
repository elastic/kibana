/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import moment from 'moment';
import { quickRanges } from './quick_ranges';
import { timeUnits } from './time_units';

const lookupByRange = {};
quickRanges.forEach(function(frame) {
  lookupByRange[frame.from + ' to ' + frame.to] = frame;
});

function formatTime(time, roundUp = false) {
  if (moment.isMoment(time)) {
    return time.format('lll');
  } else {
    if (time === 'now') {
      return 'now';
    } else {
      const tryParse = dateMath.parse(time, { roundUp });
      return moment.isMoment(tryParse) ? '~ ' + tryParse.fromNow() : time;
    }
  }
}

function cantLookup(from, to) {
  return `${formatTime(from)} to ${formatTime(to)}`;
}

export function formatDuration(from, to) {
  let text;
  // If both parts are date math, try to look up a reasonable string
  if (from && to && !moment.isMoment(from) && !moment.isMoment(to)) {
    const tryLookup = lookupByRange[from.toString() + ' to ' + to.toString()];
    if (tryLookup) {
      return tryLookup.display;
    } else {
      const fromParts = from.toString().split('-');
      if (to.toString() === 'now' && fromParts[0] === 'now' && fromParts[1]) {
        const rounded = fromParts[1].split('/');
        text = 'Last ' + rounded[0];
        if (rounded[1]) {
          text = text + ' rounded to the ' + timeUnits[rounded[1]];
        }

        return text;
      } else {
        return cantLookup(from, to);
      }
    }
    // If at least one part is a moment, try to make pretty strings by parsing date math
  } else {
    return cantLookup(from, to);
  }
}
