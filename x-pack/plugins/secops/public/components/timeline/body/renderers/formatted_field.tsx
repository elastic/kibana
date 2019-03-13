/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isNil } from 'lodash/fp';
import moment from 'moment';
import * as React from 'react';
import { pure } from 'recompose';

import { getOrEmptyTagFromValue } from '../../../empty_value';
import { PreferenceFormattedDate } from '../../../formatted_date';
import { IPDetailsLink } from '../../../links';
import { LocalizedDateTooltip } from '../../../localized_date_tooltip';

export const FormattedFieldValue = pure<{
  value: string | number | undefined | null;
  fieldName: string;
  fieldType: string;
}>(({ value, fieldName, fieldType }) => {
  const maybeDate = moment(new Date(value!));
  return fieldType === 'date' && !isNil(value) && maybeDate.isValid() ? (
    <LocalizedDateTooltip date={maybeDate.toDate()}>
      <PreferenceFormattedDate value={new Date(value!)} />
    </LocalizedDateTooltip>
  ) : fieldType === 'ip' && value != null ? (
    <IPDetailsLink ip={value.toString()} />
  ) : (
    getOrEmptyTagFromValue(value)
  );
});
