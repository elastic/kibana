/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { isEmpty } from 'lodash/fp';
import { EuiFormRow, EuiLink, EuiText } from '@elastic/eui';
import React from 'react';

import { OsqueryEditor } from '../../editor';
import { FieldHook } from '../../shared_imports';

interface CodeEditorFieldProps {
  field: FieldHook<string>;
}

const OsquerySchemaLink = React.memo(() => (
  <EuiText size="xs">
    <EuiLink href="https://osquery.io/schema/4.7.0" target="_blank">
      <FormattedMessage
        id="xpack.osquery.codeEditorField.osquerySchemaLinkLabel"
        defaultMessage="Osquery schema"
      />
    </EuiLink>
  </EuiText>
));

OsquerySchemaLink.displayName = 'OsquerySchemaLink';

const CodeEditorFieldComponent: React.FC<CodeEditorFieldProps> = ({ field }) => {
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
      <OsqueryEditor defaultValue={value} onChange={setValue} />
    </EuiFormRow>
  );
};

export const CodeEditorField = React.memo(CodeEditorFieldComponent);
