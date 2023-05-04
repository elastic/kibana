/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';

import { ConnectorFilteringLogic } from './connector_filtering_logic';

export const AdvancedSyncRules: React.FC = () => {
  const { hasJsonValidationError: hasError, localAdvancedSnippet } =
    useValues(ConnectorFilteringLogic);
  const { setLocalAdvancedSnippet } = useActions(ConnectorFilteringLogic);
  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.enterpriseSearch.content.indices.connector.syncRules.advancedRules.title',
        {
          defaultMessage: 'Advanced rules',
        }
      )}
      isInvalid={hasError}
      error={
        hasError
          ? i18n.translate(
              'xpack.enterpriseSearch.content.indices.connector.syncRules.advancedRules.error',
              {
                defaultMessage: 'JSON format is invalid',
              }
            )
          : undefined
      }
      fullWidth
    >
      <CodeEditor
        isCopyable
        languageId="json"
        options={{
          detectIndentation: true,
          lineNumbers: 'on',
          tabSize: 2,
        }}
        value={localAdvancedSnippet}
        onChange={(value) => {
          setLocalAdvancedSnippet(value);
        }}
        height="250px"
        width="100%"
      />
    </EuiFormRow>
  );
};
