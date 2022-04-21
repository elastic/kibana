/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ContentType, Mode } from './types';

import { KeyValuePairsField, Pair } from './key_value_field';

interface Props {
  contentMode?: Mode;
  defaultValue: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  onBlur?: () => void;
  'data-test-subj'?: string;
}

export const HeaderField = ({
  contentMode,
  defaultValue,
  onChange,
  onBlur,
  'data-test-subj': dataTestSubj,
}: Props) => {
  const defaultValueKeys = Object.keys(defaultValue).filter((key) => key !== 'Content-Type'); // Content-Type is a secret header we hide from the user
  const formattedDefaultValues: Pair[] = [
    ...defaultValueKeys.map<Pair>((key) => {
      return [key || '', defaultValue[key] || '']; // key, value
    }),
  ];
  const [headers, setHeaders] = useState<Pair[]>(formattedDefaultValues);

  useEffect(() => {
    const formattedHeaders = headers.reduce((acc: Record<string, string>, header) => {
      const [key, value] = header;
      if (key) {
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
    <KeyValuePairsField
      addPairControlLabel={
        <FormattedMessage
          id="xpack.uptime.createPackagePolicy.stepConfigure.headerField.addHeader.label"
          defaultMessage="Add header"
        />
      }
      defaultPairs={headers}
      onChange={setHeaders}
      onBlur={() => onBlur?.()}
      data-test-subj={dataTestSubj}
    />
  );
};

export const contentTypes: Record<Mode, ContentType> = {
  [Mode.JSON]: ContentType.JSON,
  [Mode.PLAINTEXT]: ContentType.TEXT,
  [Mode.XML]: ContentType.XML,
  [Mode.FORM]: ContentType.FORM,
};
