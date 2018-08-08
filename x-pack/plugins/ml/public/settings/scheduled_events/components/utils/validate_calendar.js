/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



//  Calendar ID requires the same format as a Job ID, therefore isJobIdValid can be used

import { isJobIdValid } from 'plugins/ml/../common/util/job_utils';
import _ from 'lodash';

export function validateCalendarId(calendarId, checks) {
  let valid = true;

  _.each(checks, item => item.valid = true);

  if (calendarId === '' || calendarId === undefined) {
    checks.calendarId.valid = false;
  } else if (isJobIdValid(calendarId) === false) {
    checks.calendarId.valid = false;
    let msg = 'Calendar ID can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ';
    msg += 'must start and end with an alphanumeric character';
    checks.calendarId.message = msg;
  }

  _.each(checks, (item) => {
    if (item.valid === false) {
      valid = false;
    }
  });

  return valid;
}
