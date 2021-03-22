/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow } from '@elastic/eui';
import { ContentType, Mode } from './types';

import { KeyValuePairsField, Pair } from './key_value_field';

interface Props {
  contentMode?: Mode;
  defaultValue: Record<string, string>;
  label: string | React.ReactElement;
  isInvalid: boolean;
  onChange: (value: Record<string, string>) => void;
}

export const HeaderField = ({ contentMode, defaultValue, label, isInvalid, onChange }: Props) => {
  const defaultValueKeys = Object.keys(defaultValue).filter((key) => key !== 'Content-Type'); // Content-Type is a secret header we hide from the user
  const formattedDefaultValues: Pair[] = [
    ...defaultValueKeys.map<Pair>((key) => {
      return [key || '', defaultValue[key] || '', true]; // key, value, checked
    }),
    ['', '', false],
  ];
  const [headers, setHeaders] = useState<Pair[]>(
    defaultValueKeys.length ? formattedDefaultValues : [['', '', false]]
  );

  useEffect(() => {
    const formattedHeaders = headers.reduce((acc: Record<string, string>, header) => {
      const [key, value, checked] = header;
      if (checked) {
        return {
          ...acc,
          [key]: value,
        };
      }
      return acc;
    }, {});

    if (contentMode) {
      onChange({ 'Content-Type': contentTypes[contentMode], ...formattedHeaders });
    } else {
      onChange(formattedHeaders);
    }
  }, [contentMode, headers, onChange]);

  return (
    <EuiFormRow
      fullWidth
      label={label}
      isInvalid={isInvalid}
      error={
        isInvalid
          ? [
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.headersField.error"
                defaultMessage="Header key must be a valid HTTP token"
              />,
            ]
          : undefined
      }
    >
      <KeyValuePairsField defaultPairs={headers} onChange={setHeaders} />
    </EuiFormRow>
  );
};

export const contentTypes: Record<Mode, ContentType> = {
  [Mode.JSON]: ContentType.JSON,
  [Mode.TEXT]: ContentType.TEXT,
  [Mode.XML]: ContentType.XML,
  [Mode.FORM]: ContentType.FORM,
};
