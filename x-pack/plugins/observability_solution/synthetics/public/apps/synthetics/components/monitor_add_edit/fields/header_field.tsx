/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ContentType, CodeEditorMode } from '../types';

import { KeyValuePairsField, Pair } from './key_value_field';

export interface HeaderFieldProps {
  contentMode?: CodeEditorMode;
  defaultValue: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  onBlur?: () => void;
  'data-test-subj'?: string;
  readOnly?: boolean;
}

export const HeaderField = ({
  contentMode,
  defaultValue,
  onChange,
  onBlur,
  'data-test-subj': dataTestSubj,
  readOnly,
}: HeaderFieldProps) => {
  const defaultValueKeys = Object.keys(defaultValue).filter(
    filterContentType(defaultValue, contentTypes, contentMode)
  );
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
          id="xpack.synthetics.createPackagePolicy.stepConfigure.headerField.addHeader.label"
          defaultMessage="Add header"
        />
      }
      defaultPairs={headers}
      onChange={setHeaders}
      onBlur={() => onBlur?.()}
      data-test-subj={dataTestSubj}
      readOnly={readOnly}
    />
  );
};

// We apply default `Content-Type` headers automatically depending on the request body mime type
// We hide the default Content-Type headers from the user as an implementation detail
// However, If the user applies a custom `Content-Type` header, it should be shown
export const filterContentType =
  (
    defaultValue: Record<string, string>,
    contentTypeMap: Record<CodeEditorMode, ContentType>,
    contentMode?: CodeEditorMode
  ) =>
  (key: string) => {
    return (
      key !== 'Content-Type' ||
      (key === 'Content-Type' && contentMode && defaultValue[key] !== contentTypeMap[contentMode])
    );
  };

export const contentTypes: Record<CodeEditorMode, ContentType> = {
  [CodeEditorMode.JSON]: ContentType.JSON,
  [CodeEditorMode.PLAINTEXT]: ContentType.TEXT,
  [CodeEditorMode.XML]: ContentType.XML,
  [CodeEditorMode.FORM]: ContentType.FORM,
};
