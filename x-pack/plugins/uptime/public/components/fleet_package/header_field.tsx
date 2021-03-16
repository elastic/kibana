/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow } from '@elastic/eui';
import { ConfigKeys, ContentType, Mode, IHTTPAdvancedFields } from './types';

import { KeyValuePairsField, Pair } from './key_value_field';

interface Props {
  configKey: ConfigKeys;
  label: string | React.ReactElement;
  contentMode?: Mode;
  setFields: React.Dispatch<React.SetStateAction<IHTTPAdvancedFields>>;
}

export const HeaderField = ({ configKey, contentMode, label, setFields }: Props) => {
  const [headers, setHeaders] = useState<Pair[]>([['', '', false]]);
  const isInvalid = headers.some((header) => {
    const [key] = header;
    if (key) {
      const whiteSpaceRegEx = /[\s]/g;
      return whiteSpaceRegEx.test(key);
    } else {
      return false;
    }
  });

  useEffect(() => {
    setFields((prevFields) => {
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
        return {
          ...prevFields,
          [configKey]: { 'Content-Type': contentTypes[contentMode], ...formattedHeaders },
        };
      } else {
        return {
          ...prevFields,
          [configKey]: formattedHeaders,
        };
      }
    });
  }, [configKey, contentMode, headers, setFields]);

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
      <KeyValuePairsField configKey={configKey} defaultPairs={headers} onChange={setHeaders} />
    </EuiFormRow>
  );
};

export const contentTypes: Record<Mode, ContentType> = {
  [Mode.JSON]: ContentType.JSON,
  [Mode.TEXT]: ContentType.TEXT,
  [Mode.XML]: ContentType.XML,
  [Mode.FORM]: ContentType.FORM,
};
