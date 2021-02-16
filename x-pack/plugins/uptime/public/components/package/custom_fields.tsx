/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiForm, EuiFormRow, EuiFieldText } from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { ICustomFields } from './types';
/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */

interface Props {
  defaultValues: ICustomFields;
  onChange: (fields: ICustomFields) => void;
}

export const CustomFields = ({ defaultValues, onChange }: Props) => {
  const [schedule, setSchedule] = useState<string>(defaultValues.schedule);
  const [urls, setUrl] = useState<string>(defaultValues.schedule);

  useDebounce(
    () => {
      // urls and schedule is managed by us, name is managed by fleet
      onChange({ urls, schedule });
    },
    250,
    [urls, schedule]
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem />
      <EuiFlexItem>
        <EuiForm component="form">
          <EuiFormRow
            label="Schedule"
            isInvalid={!schedule}
            error={!schedule ? ['Schedule is required'] : undefined}
          >
            <EuiFieldText
              value={schedule}
              onChange={(event) => handleInputChange({ event, onInputChange: setSchedule })}
            />
          </EuiFormRow>
          <EuiFormRow label="Url" isInvalid={!urls} error={!urls ? ['Url is required'] : undefined}>
            <EuiFieldText
              value={urls}
              onChange={(event) => handleInputChange({ event, onInputChange: setUrl })}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const handleInputChange = ({
  event,
  onInputChange,
}: {
  event: React.ChangeEvent<HTMLInputElement>;
  onInputChange: (value: string) => void;
}) => {
  onInputChange(event.target.value);
};
