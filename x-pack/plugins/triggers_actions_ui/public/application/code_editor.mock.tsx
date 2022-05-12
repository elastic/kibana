/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

export const mockEditorInstance = {
  executeEdits: () => {},
  getSelection: () => {},
  getValue: () => {},
  onDidBlurEditorWidget: () => ({
    dispose: () => {},
  }),
};

export const MockCodeEditor = (props: any) => {
  const { editorDidMount } = props;
  useEffect(() => {
    editorDidMount(mockEditorInstance);
  }, [editorDidMount]);

  return (
    <input
      data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
      data-value={props.value}
      value={props.value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        props.onChange(e.target.value);
      }}
    />
  );
};
