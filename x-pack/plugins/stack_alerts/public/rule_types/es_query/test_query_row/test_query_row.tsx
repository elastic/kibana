/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode, useState } from 'react';
import {
  copyToClipboard,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ParsedAggregationResults } from '@kbn/triggers-actions-ui-plugin/common';
import { useTestQuery } from './use_test_query';

export interface TestQueryRowProps {
  fetch: () => Promise<{
    testResults: ParsedAggregationResults;
    isGrouped: boolean;
    timeWindow: string;
  }>;
  copyQuery?: () => string;
  hasValidationErrors: boolean;
}

export const TestQueryRow: React.FC<TestQueryRowProps> = ({
  fetch,
  copyQuery,
  hasValidationErrors,
}) => {
  const { onTestQuery, testQueryResult, testQueryError, testQueryLoading } = useTestQuery(fetch);
  const [copiedMessage, setCopiedMessage] = useState<ReactNode | null>(null);

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
              <EuiToolTip
                content={copiedMessage}
                onMouseOut={() => {
                  setCopiedMessage(null);
                }}
              >
                <EuiButtonEmpty
                  data-test-subj="copyQuery"
                  color="primary"
                  iconSide="left"
                  iconType="copyClipboard"
                  onClick={() => {
                    const copied = copyToClipboard(copyQuery());
                    if (copied) {
                      setCopiedMessage(
                        <FormattedMessage
                          id="xpack.stackAlerts.esQuery.ui.queryCopiedToClipboard"
                          defaultMessage="Copied"
                        />
                      );
                    }
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
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
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
};
