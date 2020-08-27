/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { XJsonLang } from '@kbn/monaco';
import React, { FunctionComponent, useCallback } from 'react';
import { FieldHook, Monaco } from '../../../../../../shared_imports';

import { TextEditor } from './text_editor';

interface Props {
  field: FieldHook<string>;
  editorProps: { [key: string]: any };
}

export const XJsonEditor: FunctionComponent<Props> = ({ field, editorProps }) => {
  const { value, setValue } = field;
  const { xJson, setXJson, convertToJson } = Monaco.useXJsonMode(value);

  const onChange = useCallback(
    (s) => {
      setXJson(s);
      setValue(convertToJson(s));
    },
    [setValue, setXJson, convertToJson]
  );
  return (
    <TextEditor
      field={field}
      editorProps={{
        value: xJson,
        languageId: XJsonLang.ID,
        options: { minimap: { enabled: false } },
        onChange,
        ...editorProps,
      }}
    />
  );
};
