/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import * as React from 'react';
import { pure } from 'recompose';

import { Ecs } from '../../../../../server/graphql/types';
import { getMappedEcsValue } from '../../../../lib/ecs';
import { getOrEmptyTag } from '../../../empty_value';
import { PreferenceFormattedDate } from '../../../formatted_date';
import { LocalizedDateTooltip } from '../../../localized_date_tooltip';

export const FormattedField = pure<{ data: Ecs; fieldName: string; fieldType: string }>(
  ({ data, fieldName, fieldType }) => {
    const value = getMappedEcsValue({ data, fieldName });
    const maybeDate = moment(new Date(value!));

    return fieldType === 'date' && value != null && maybeDate.isValid() ? (
      <LocalizedDateTooltip date={maybeDate.toDate()}>
        <PreferenceFormattedDate value={value} />
      </LocalizedDateTooltip>
    ) : (
      getOrEmptyTag(fieldName, data)
    );
  }
);
