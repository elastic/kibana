/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { OsqueryEditor } from '../../editor';
import { FieldHook } from '../../shared_imports';

interface CodeEditorFieldProps {
  field: FieldHook<string>;
}

const CodeEditorFieldComponent: React.FC<CodeEditorFieldProps> = ({ field }) => {
  const { value, setValue } = field;

  return <OsqueryEditor defaultValue={value} onChange={setValue} />;
};

export const CodeEditorField = React.memo(CodeEditorFieldComponent);
