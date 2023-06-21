/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import moment, { Moment } from 'moment';
import 'moment-timezone';

import { FormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

export function getSelectedForDatePicker(
  form: FormData,
  path: string,
  timezone?: string[]
): { selected: Moment; utcOffset: number } {
  // parse from a string date to moment() if there is an intitial value
  // otherwise just get the current date
  const initialValue = get(form, path);
  let selected = moment();
  if (initialValue && moment(initialValue).isValid()) {
    selected = moment(initialValue);
  }
  const utcOffset =
    timezone && timezone.length > 0
      ? moment()
          .tz(timezone[0])
          .year(selected.year())
          .month(selected.month())
          .date(selected.date())
          .hour(selected.hour())
          .minute(selected.minute())
          .second(selected.second())
          .millisecond(selected.millisecond())
          .utcOffset()
      : selected.utcOffset();
  return { selected: selected.clone().utcOffset(utcOffset), utcOffset };
}
