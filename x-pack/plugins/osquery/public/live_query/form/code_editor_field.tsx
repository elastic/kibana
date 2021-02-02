/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';

import { OsqueryEditor } from '../../editor';
import { FieldHook } from '../../shared_imports';

interface CodeEditorFieldProps {
  field: FieldHook<{ query: string }>;
}

const CodeEditorFieldComponent: React.FC<CodeEditorFieldProps> = ({ field }) => {
  const { value, setValue } = field;
  const handleChange = useCallback(
    (newQuery) => {
      setValue({
        ...value,
        query: newQuery,
      });
    },
    [value, setValue]
  );

  return <OsqueryEditor defaultValue={value.query} onChange={handleChange} />;
};

export const CodeEditorField = React.memo(CodeEditorFieldComponent);
