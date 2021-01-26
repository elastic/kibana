/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import {
  getSeverityOptions,
  SEVERITY_OPTIONS,
} from '../application/components/controls/select_severity/select_severity';

export interface SeveritySelectorProps {
  value: number | undefined;
  onChange: (value: number) => void;
}

export const SeveritySelector: FC<SeveritySelectorProps> = ({ value, onChange }) => {
  const options = useMemo(() => getSeverityOptions(), []);

  const valueOfSelected = useMemo(
    () => SEVERITY_OPTIONS.find((v) => v.val === value)?.display ?? '',
    [value]
  );

  const onValueChange = (selectedValue: string) => {
    const result = SEVERITY_OPTIONS.find((v) => v.display === selectedValue);
    onChange(result!.val);
  };

  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.ml.severitySelector.formControlLabel"
          defaultMessage="Select severity threshold"
        />
      }
    >
      <EuiSuperSelect
        hasDividers
        options={options}
        valueOfSelected={valueOfSelected}
        onChange={onValueChange}
      />
    </EuiFormRow>
  );
};
