/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

interface Props {
  previewDateColumns: string[];
  indexPatternDateField: string | undefined;
  onTimeFieldChanged: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const StepDetailsTimeField: FC<Props> = ({
  previewDateColumns,
  indexPatternDateField,
  onTimeFieldChanged,
}) => {
  const noTimeFieldLabel = i18n.translate(
    'xpack.transform.stepDetailsForm.noTimeFieldOptionLabel',
    {
      defaultMessage: "I don't want to use the Time Filter",
    }
  );

  const noTimeFieldOption = {
    text: noTimeFieldLabel,
    value: undefined,
  };

  const disabledDividerOption = {
    disabled: true,
    text: '───',
    value: '',
  };

  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.transform.stepDetailsForm.indexPatternTimeFilterLabel"
          defaultMessage="Time Filter field name"
        />
      }
      helpText={
        <FormattedMessage
          id="xpack.transform.stepDetailsForm.indexPatternTimeFilterHelpText"
          defaultMessage="The Time Filter will use this field to filter your data by time. You can choose not to have a time field, but you will not be able to narrow down your data by a time range."
        />
      }
    >
      <EuiSelect
        options={[
          ...previewDateColumns.map((text) => ({ text })),
          disabledDividerOption,
          noTimeFieldOption,
        ]}
        value={indexPatternDateField}
        onChange={onTimeFieldChanged}
        data-test-subj="transformIndexPatternDateFieldSelect"
      />
    </EuiFormRow>
  );
};
