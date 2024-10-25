/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { XJsonLang } from '@kbn/monaco';
import React, { FunctionComponent, useCallback } from 'react';
import { FieldHook, XJson } from '../../../../../../shared_imports';

const { useXJsonMode } = XJson;

import { TextEditor } from './text_editor';

interface Props {
  field: FieldHook<string>;
  editorProps: { [key: string]: any };
  useRawValue?: boolean;
}

const defaultEditorOptions = {
  minimap: { enabled: false },
  lineNumbers: 'off',
};

export const XJsonEditor: FunctionComponent<Props> = ({ field, editorProps, useRawValue }) => {
  const { value, setValue } = field;
  const { xJson, setXJson, convertToJson } = useXJsonMode(value);

  const onChange = useCallback(
    (s: string) => {
      if (useRawValue) {
        setValue(s);
      } else {
        setXJson(s);
        setValue(convertToJson(s));
      }
    },
    [setValue, setXJson, convertToJson, useRawValue]
  );
  return (
    <TextEditor
      field={field}
      editorProps={{
        value: useRawValue ? value : xJson,
        languageId: XJsonLang.ID,
        options: defaultEditorOptions,
        onChange,
        ...editorProps,
      }}
    />
  );
};
