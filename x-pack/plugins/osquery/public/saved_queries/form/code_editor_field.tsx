/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { EuiCodeBlock, EuiFormRow } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { OsquerySchemaLink } from '../../components/osquery_schema_link';
import { OsqueryEditor } from '../../editor';
import { FieldHook } from '../../shared_imports';

const StyledEuiCodeBlock = styled(EuiCodeBlock)`
  min-height: 100px;
`;

interface CodeEditorFieldProps {
  euiFieldProps?: Record<string, unknown>;
  field: FieldHook<string>;
}

const CodeEditorFieldComponent: React.FC<CodeEditorFieldProps> = ({ euiFieldProps, field }) => {
  const { value, label, labelAppend, helpText, setValue, errors } = field;
  const error = errors[0]?.message;

  return (
    <EuiFormRow
      label={label}
      labelAppend={!isEmpty(labelAppend) ? labelAppend : <OsquerySchemaLink />}
      helpText={helpText}
      isInvalid={typeof error === 'string'}
      error={error}
      fullWidth
    >
      {euiFieldProps?.disabled ? (
        <StyledEuiCodeBlock
          language="sql"
          fontSize="m"
          paddingSize="m"
          transparentBackground={!value.length}
        >
          {value}
        </StyledEuiCodeBlock>
      ) : (
        <OsqueryEditor defaultValue={value} onChange={setValue} />
      )}
    </EuiFormRow>
  );
};

export const CodeEditorField = React.memo(CodeEditorFieldComponent);
