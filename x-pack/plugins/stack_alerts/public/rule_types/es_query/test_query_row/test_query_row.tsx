/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  copyToClipboard,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ParsedAggregationResults } from '@kbn/triggers-actions-ui-plugin/common';
import { useTestQuery } from './use_test_query';

export const styles = {
  grid: css`
    .euiDataGridHeaderCell {
      background: none;
    }
    .euiDataGridHeader .euiDataGridHeaderCell {
      border-top: none;
    }
  `,
};

export interface TestQueryRowProps {
  fetch: () => Promise<{
    testResults: ParsedAggregationResults;
    isGrouped: boolean;
    timeWindow: string;
  }>;
  copyQuery?: () => string;
  hasValidationErrors: boolean;
  triggerTestQuery?: boolean;
  showTable?: boolean;
}

export const TestQueryRow: React.FC<TestQueryRowProps> = ({
  fetch,
  copyQuery,
  hasValidationErrors,
  triggerTestQuery,
  showTable,
}) => {
  const {
    onTestQuery,
    testQueryResult,
    testQueryError,
    testQueryLoading,
    testQueryRawResults,
    testQueryAlerts,
  } = useTestQuery(fetch);

  const [copiedMessage, setCopiedMessage] = useState<ReactNode | null>(null);

  useEffect(() => {
    if (triggerTestQuery !== undefined) {
      onTestQuery();
    }
  }, [triggerTestQuery, onTestQuery]);

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
      {showTable && testQueryRawResults && (
        <>
          <EuiSpacer size="m" />
          <EuiPanel style={{ overflow: 'hidden' }} hasShadow={false} hasBorder={true}>
            <EuiDataGrid
              css={styles.grid}
              aria-label="Test query grid"
              columns={testQueryRawResults.cols}
              columnVisibility={{
                visibleColumns: testQueryRawResults.cols.map((c) => c.id),
                setVisibleColumns: () => {},
              }}
              rowCount={testQueryRawResults.rows.length}
              gridStyle={{
                border: 'horizontal',
                rowHover: 'none',
              }}
              renderCellValue={({ rowIndex, columnId }) =>
                testQueryRawResults.rows[rowIndex][columnId]
              }
              pagination={{
                pageIndex: 0,
                pageSize: 10,
                onChangeItemsPerPage: () => {},
                onChangePage: () => {},
              }}
              toolbarVisibility={false}
            />
            <EuiSpacer size="m" />
            {testQueryAlerts && (
              <EuiFlexGroup gutterSize="m">
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <h5>
                      <FormattedMessage
                        id="xpack.stackAlerts.esQuery.ui.testQueryAlerts"
                        defaultMessage="Alerts generated"
                      />
                    </h5>
                  </EuiText>
                </EuiFlexItem>
                {testQueryAlerts.map((alert, index) => {
                  return (
                    <EuiFlexItem key={index} grow={false}>
                      <EuiBadge color="primary">{alert}</EuiBadge>
                    </EuiFlexItem>
                  );
                })}
              </EuiFlexGroup>
            )}
          </EuiPanel>
        </>
      )}
    </>
  );
};
