/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface Props {
  indexPatternAvailableTimeFields: string[];
  indexPatternTimeField: string | undefined;
  onTimeFieldChanged: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const StepDetailsTimeField: FC<Props> = ({
  indexPatternAvailableTimeFields,
  indexPatternTimeField,
  onTimeFieldChanged,
}) => {
  const noTimeFieldLabel = i18n.translate(
    'xpack.transform.stepDetailsForm.noTimeFieldOptionLabel',
    {
      defaultMessage: "I don't want to use the time field option",
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
          id="xpack.transform.stepDetailsForm.dataViewTimeFieldLabel"
          defaultMessage="Time field for Kibana data view"
        />
      }
      helpText={
        <FormattedMessage
          id="xpack.transform.stepDetailsForm.dataViewTimeFieldHelpText"
          defaultMessage="Select a primary time field for use with the global time filter."
        />
      }
    >
      <EuiSelect
        options={[
          ...indexPatternAvailableTimeFields.map((text) => ({ text })),
          disabledDividerOption,
          noTimeFieldOption,
        ]}
        value={indexPatternTimeField}
        onChange={onTimeFieldChanged}
        data-test-subj="transformIndexPatternTimeFieldSelect"
      />
    </EuiFormRow>
  );
};
