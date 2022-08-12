/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiFormRow } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { useController } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { EuiCodeEditorProps } from '../../shared_imports';
import { OsqueryEditor } from '../../editor';
import { useKibana } from '../../common/lib/kibana';
import { MAX_QUERY_LENGTH } from '../../packs/queries/validations';

const StyledEuiCodeBlock = styled(EuiCodeBlock)`
  min-height: 100px;
`;

interface LiveQueryQueryFieldProps {
  disabled?: boolean;
  commands?: EuiCodeEditorProps['commands'];
  name: string;
  queryType: string;
}

const LiveQueryQueryFieldComponent: React.FC<LiveQueryQueryFieldProps> = ({
  name: fieldName,
  disabled,
  commands,
  queryType,
}) => {
  const permissions = useKibana().services.application.capabilities.osquery;

  const { field, fieldState } = useController({
    name: fieldName,
    rules: {
      required: {
        message: i18n.translate('xpack.osquery.pack.queryFlyoutForm.emptyQueryError', {
          defaultMessage: 'Query is a required field',
        }),
        value: queryType === 'query',
      },
      maxLength: {
        message: i18n.translate('xpack.osquery.liveQuery.queryForm.largeQueryError', {
          defaultMessage: 'Query is too large (max {maxLength} characters)',
          values: { maxLength: MAX_QUERY_LENGTH },
        }),
        value: MAX_QUERY_LENGTH,
      },
    },
    defaultValue: '',
  });
  const { onChange, value } = field;
  const { error } = fieldState;

  return (
    <EuiFormRow
      isInvalid={!!error?.message}
      error={error?.message}
      fullWidth
      isDisabled={!permissions.writeLiveQueries || disabled}
    >
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
        <OsqueryEditor defaultValue={value} onChange={onChange} commands={commands} />
      )}
    </EuiFormRow>
  );
};

export const LiveQueryQueryField = React.memo(LiveQueryQueryFieldComponent);
