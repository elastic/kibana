/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiFormRow, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useRef } from 'react';
import styled from 'styled-components';

import { OsquerySchemaLink } from '../../components/osquery_schema_link';
import { FieldHook } from '../../shared_imports';
import { OsqueryEditor } from '../../editor';
import {
  SavedQueriesDropdown,
  SavedQueriesDropdownRef,
} from '../../saved_queries/saved_queries_dropdown';
import { useKibana } from '../../common/lib/kibana';

const StyledEuiCodeBlock = styled(EuiCodeBlock)`
  min-height: 150px;
`;

interface LiveQueryQueryFieldProps {
  disabled?: boolean;
  field: FieldHook<string>;
}

const LiveQueryQueryFieldComponent: React.FC<LiveQueryQueryFieldProps> = ({ disabled, field }) => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const { value, setValue, errors } = field;
  const error = errors[0]?.message;
  const savedQueriesDropdownRef = useRef<SavedQueriesDropdownRef>(null);

  const handleSavedQueryChange = useCallback(
    (savedQuery) => {
      setValue(savedQuery?.query ?? '');
    },
    [setValue]
  );

  const handleEditorChange = useCallback(
    (newValue) => {
      savedQueriesDropdownRef.current?.clearSelection();
      setValue(newValue);
    },
    [setValue]
  );

  return (
    <EuiFormRow isInvalid={typeof error === 'string'} error={error} fullWidth>
      <>
        <SavedQueriesDropdown
          ref={savedQueriesDropdownRef}
          disabled={disabled || !permissions.runSavedQueries}
          onChange={handleSavedQueryChange}
        />
        <EuiSpacer />
        <EuiFormRow fullWidth labelAppend={<OsquerySchemaLink />}>
          {!permissions.writeLiveQueries || disabled ? (
            <StyledEuiCodeBlock
              language="sql"
              fontSize="m"
              paddingSize="m"
              transparentBackground={!value.length}
            >
              {value}
            </StyledEuiCodeBlock>
          ) : (
            <OsqueryEditor defaultValue={value} onChange={handleEditorChange} />
          )}
        </EuiFormRow>
      </>
    </EuiFormRow>
  );
};

export const LiveQueryQueryField = React.memo(LiveQueryQueryFieldComponent);
