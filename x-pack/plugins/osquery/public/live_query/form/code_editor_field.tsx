/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';

import { OsqueryEditor } from '../../editor';

const CodeEditorFieldComponent = ({ field }) => {
  console.error('CodeEditorFieldComponent', field);

  const handleChange = useCallback(
    (newQuery) => {
      field.setValue({
        ...field.value,
        query: newQuery,
      });
    },
    [field]
  );

  return <OsqueryEditor defaultValue={field.value.query} onChange={handleChange} />;
};

export const CodeEditorField = React.memo(CodeEditorFieldComponent);
