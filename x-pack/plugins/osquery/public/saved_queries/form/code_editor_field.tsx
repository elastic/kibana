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

import { useController } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { MAX_QUERY_LENGTH } from '../../packs/queries/validations';
import { OsquerySchemaLink } from '../../components/osquery_schema_link';
import { OsqueryEditor } from '../../editor';

const StyledEuiCodeBlock = styled(EuiCodeBlock)`
  min-height: 100px;
`;

interface CodeEditorFieldProps {
  euiFieldProps?: Record<string, unknown>;
  labelAppend?: string;
  helpText?: string;
}

const CodeEditorFieldComponent: React.FC<CodeEditorFieldProps> = ({
  euiFieldProps,
  labelAppend,
  helpText,
}) => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name: 'query',
    rules: {
      required: {
        message: i18n.translate('xpack.osquery.pack.queryFlyoutForm.emptyQueryError', {
          defaultMessage: 'Query is a required field',
        }),
        value: true,
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

  return (
    <EuiFormRow
      label={i18n.translate('xpack.osquery.savedQuery.queryEditorLabel', {
        defaultMessage: 'Query',
      })}
      labelAppend={!isEmpty(labelAppend) ? labelAppend : <OsquerySchemaLink />}
      helpText={helpText}
      isInvalid={!!error?.message}
      error={error?.message}
      fullWidth
    >
      {euiFieldProps?.isDisabled ? (
        <StyledEuiCodeBlock
          language="sql"
          fontSize="m"
          paddingSize="m"
          transparentBackground={!value.length}
        >
          {value}
        </StyledEuiCodeBlock>
      ) : (
        <OsqueryEditor defaultValue={value} onChange={onChange} />
      )}
    </EuiFormRow>
  );
};

export const CodeEditorField = React.memo(CodeEditorFieldComponent);
