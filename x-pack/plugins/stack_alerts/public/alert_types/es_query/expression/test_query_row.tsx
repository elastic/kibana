/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  copyToClipboard,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTestQuery } from './use_test_query';

export function TestQueryRow({
  fetch,
  copyQuery,
  hasValidationErrors,
}: {
  fetch: () => Promise<{ nrOfDocs: number; timeWindow: string }>;
  copyQuery?: () => string;
  hasValidationErrors: boolean;
}) {
  const { onTestQuery, testQueryResult, testQueryError, testQueryLoading } = useTestQuery(fetch);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);

  let message: React.ReactElement | undefined;

  if (showCopiedMessage) {
    message = (
      <EuiText data-test-subj="queryCopiedMessage" color="subdued" size="s">
        <p>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.queryCopiedToClipboard"
            defaultMessage="Query copied to clipboard."
          />
        </p>
      </EuiText>
    );
  } else if (testQueryLoading) {
    message = (
      <EuiText color="subdued" size="s">
        <p>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.testQueryIsExecuted"
            defaultMessage="Query is executed."
          />
        </p>
      </EuiText>
    );
  } else if (testQueryResult) {
    message = (
      <EuiText data-test-subj="testQuerySuccess" color="subdued" size="s">
        <p>{testQueryResult}</p>
      </EuiText>
    );
  } else if (testQueryError) {
    message = (
      <EuiText data-test-subj="testQueryError" color="danger" size="s">
        <p>{testQueryError}</p>
      </EuiText>
    );
  }

  return (
    <>
      <EuiFormRow>
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="testQuery"
              color="primary"
              iconSide="left"
              iconType="playFilled"
              onClick={() => {
                setShowCopiedMessage(false);
                onTestQuery();
              }}
              disabled={hasValidationErrors}
              isLoading={testQueryLoading}
              size="s"
            >
              <FormattedMessage
                id="xpack.stackAlerts.esQuery.ui.testQuery"
                defaultMessage="Test query"
              />
            </EuiButton>
          </EuiFlexItem>
          {copyQuery && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="copyQuery"
                color="primary"
                iconSide="left"
                iconType="copyClipboard"
                onClick={() => {
                  const copied = copyToClipboard(copyQuery());
                  setShowCopiedMessage(copied);
                }}
                disabled={hasValidationErrors}
                isLoading={testQueryLoading}
                size="s"
              >
                <FormattedMessage
                  id="xpack.stackAlerts.esQuery.ui.copyQuery"
                  defaultMessage="Copy query"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFormRow>
      {message && <EuiFormRow>{message}</EuiFormRow>}
    </>
  );
}
