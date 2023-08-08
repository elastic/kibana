/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { EuiFormRow, EuiSelect, EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  disabled?: boolean;
  minute?: string;
  minuteOptions: EuiSelectOption[];
  onChange: ({ minute }: { minute?: string }) => void;
}

export const CronMinutely: React.FunctionComponent<Props> = ({
  disabled,
  minute,
  minuteOptions,
  onChange,
}) => (
  <Fragment>
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.enterpriseSearch.cronEditor.cronMinutely.fieldTimeLabel"
          defaultMessage="Minute"
        />
      }
      fullWidth
      data-test-subj="cronFrequencyConfiguration"
    >
      <EuiSelect
        disabled={disabled}
        options={minuteOptions}
        value={minute}
        onChange={(e) => onChange({ minute: e.target.value })}
        fullWidth
        prepend={i18n.translate(
          'xpack.enterpriseSearch.cronEditor.cronMinutely.fieldMinute.textAtLabel',
          {
            defaultMessage: 'Every',
          }
        )}
        append={i18n.translate(
          'xpack.enterpriseSearch.cronEditor.cronMinutely.fieldMinute.textAppendLabel',
          {
            defaultMessage: 'minutes',
          }
        )}
        data-test-subj="cronFrequencyMinutelyMinuteSelect"
      />
    </EuiFormRow>
  </Fragment>
);
