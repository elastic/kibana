/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiFormRow, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTestQuery } from './use_test_query';

export function TestQueryRow({
  fetch,
  hasValidationErrors,
}: {
  fetch: () => Promise<{ nrOfDocs: number; timeWindow: string }>;
  hasValidationErrors: boolean;
}) {
  const { onTestQuery, testQueryResult, testQueryError, testQueryLoading } = useTestQuery(fetch);

  return (
    <>
      <EuiFormRow>
        <EuiButton
          data-test-subj="testQuery"
          color="primary"
          iconSide="left"
          iconType="playFilled"
          onClick={onTestQuery}
          disabled={hasValidationErrors}
          isLoading={testQueryLoading}
          size="s"
        >
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.testQuery"
            defaultMessage="Test query"
          />
        </EuiButton>
      </EuiFormRow>
      {testQueryLoading && (
        <EuiFormRow>
          <EuiText color="subdued" size="s">
            <p>
              <FormattedMessage
                id="xpack.stackAlerts.esQuery.ui.testQueryIsExecuted"
                defaultMessage="Query is executed."
              />
            </p>
          </EuiText>
        </EuiFormRow>
      )}
      {testQueryResult && (
        <EuiFormRow>
          <EuiText data-test-subj="testQuerySuccess" color="subdued" size="s">
            <p>{testQueryResult}</p>
          </EuiText>
        </EuiFormRow>
      )}
      {testQueryError && (
        <EuiFormRow>
          <EuiText data-test-subj="testQueryError" color="danger" size="s">
            <p>{testQueryError}</p>
          </EuiText>
        </EuiFormRow>
      )}
    </>
  );
}
