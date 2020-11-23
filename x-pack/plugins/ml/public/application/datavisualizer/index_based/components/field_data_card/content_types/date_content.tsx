/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiSpacer } from '@elastic/eui';
// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';

import { FormattedMessage } from '@kbn/i18n/react';

import { FieldDataCardProps } from '../field_data_card';

const TIME_FORMAT = 'MMM D YYYY, HH:mm:ss.SSS';

export const DateContent: FC<FieldDataCardProps> = ({ config }) => {
  const { stats } = config;

  const { earliest, latest } = stats;

  return (
    <div className="mlFieldDataCard__stats">
      <div data-test-subj="mlFieldDataCardEarliest">
        <FormattedMessage
          id="xpack.ml.fieldDataCard.cardDate.earliestDescription"
          defaultMessage="earliest {earliestFormatted}"
          values={{
            earliestFormatted: formatDate(earliest, TIME_FORMAT),
          }}
        />
      </div>

      <EuiSpacer size="s" />

      <div data-test-subj="mlFieldDataCardLatest">
        <FormattedMessage
          id="xpack.ml.fieldDataCard.cardDate.latestDescription"
          defaultMessage="latest {latestFormatted}"
          values={{
            latestFormatted: formatDate(latest, TIME_FORMAT),
          }}
        />
      </div>
    </div>
  );
};
