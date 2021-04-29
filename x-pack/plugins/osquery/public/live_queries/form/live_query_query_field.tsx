/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { EuiFormRow } from '@elastic/eui';
import { FieldHook } from '../../shared_imports';
import { OsqueryEditor } from '../../editor';

interface LiveQueryQueryFieldProps {
  disabled?: boolean;
  field: FieldHook<string>;
}

const LiveQueryQueryFieldComponent: React.FC<LiveQueryQueryFieldProps> = ({ disabled, field }) => {
  const { value, setValue, errors } = field;
  const error = errors[0]?.message;

  const handleEditorChange = useCallback(
    (newValue) => {
      setValue(newValue);
    },
    [setValue]
  );

  return (
    <EuiFormRow isInvalid={typeof error === 'string'} error={error} fullWidth>
      <OsqueryEditor defaultValue={value} disabled={disabled} onChange={handleEditorChange} />
    </EuiFormRow>
  );
};

export const LiveQueryQueryField = React.memo(LiveQueryQueryFieldComponent);
