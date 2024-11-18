/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { XJsonLang } from '@kbn/monaco';
import React, { FunctionComponent, useCallback } from 'react';
import { FieldHook } from '../../../../../../shared_imports';

import { TextEditor } from './text_editor';

interface Props {
  field: FieldHook<string>;
  editorProps: { [key: string]: any };
}

const defaultEditorOptions = {
  minimap: { enabled: false },
  lineNumbers: 'off',
};

export const XJsonAndJsonEditor: FunctionComponent<Props> = ({ field, editorProps }) => {
  const { value, setValue } = field;
  const onChange = useCallback(
    (s: any) => {
      setValue(s);
    },
    [setValue]
  );
  return (
    <TextEditor
      field={field}
      editorProps={{
        value,
        languageId: XJsonLang.ID,
        options: defaultEditorOptions,
        onChange,
        ...editorProps,
      }}
    />
  );
};
