/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isString } from 'lodash/fp';
import moment from 'moment';

export const getMaybeDate = (value: string | number): moment.Moment => {
  if (isString(value) && value.trim() !== '') {
    const maybeDate = moment(new Date(value));
    if (maybeDate.isValid() || isNaN(+value)) {
      return maybeDate;
    } else {
      return moment(new Date(+value));
    }
  } else {
    return moment(new Date(value));
  }
};
