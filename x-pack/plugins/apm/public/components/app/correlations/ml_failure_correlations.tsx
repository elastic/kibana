/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiCode,
  EuiAccordion,
  EuiPanel,
  EuiBasicTableColumn,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { CorrelationsTable } from './correlations_table';
import { enableInspectEsQueries } from '../../../../../observability/public';
import { asPreciseDecimal } from '../../../../common/utils/formatters';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { LatencyCorrelationsHelpPopover } from './ml_latency_correlations_help_popover';
import { useCorrelationsSearchStrategy } from './use_correlations_search_strategy';
import {
  BaseSearchStrategyResponse,
  ErrorCorrelationValue,
  FailedTransactionCorrelationImpact,
} from '../../../../common/search_strategies/error_correlations/types';
import { ImpactBar } from '../../shared/ImpactBar';
import {
  APM_ERROR_CORRELATION_SEARCH_STRATEGY,
  FAILED_TRANSACTION_CORRELATION_IMPACT,
} from '../../../../common/search_strategies/error_correlations/constants';
import { isErrorMessage } from './utils/is_error_message';
import { Summary } from '../../shared/Summary';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';

interface Props {
  onClose: () => void;
}

interface ErrorCorrelationSearchStrategyResult
  extends BaseSearchStrategyResponse {
  values: ErrorCorrelationValue[];
}

export function getFailedTransactionsImpactLabel(
  pValue: number
): FailedTransactionCorrelationImpact | null {
  if (pValue > 0 && pValue < 1e-6)
    return FAILED_TRANSACTION_CORRELATION_IMPACT.HIGH;
  if (pValue >= 1e-6 && pValue < 0.001)
    return FAILED_TRANSACTION_CORRELATION_IMPACT.MEDIUM;
  if (pValue >= 0.001 && pValue <= 0.02)
    return FAILED_TRANSACTION_CORRELATION_IMPACT.LOW;

  return null;
}

export function MlFailureCorrelations({ onClose }: Props) {
  const {
    core: { notifications, uiSettings },
  } = useApmPluginContext();

  const { serviceName, transactionType } = useApmServiceContext();
  const { urlParams } = useUrlParams();

  const { environment, kuery, transactionName, start, end } = urlParams;

  const displayLog = uiSettings.get<boolean>(enableInspectEsQueries);

  const result = useCorrelationsSearchStrategy<ErrorCorrelationSearchStrategyResult>(
    {
      ...{
        ...{
          environment,
          kuery,
          serviceName,
          transactionName,
          transactionType,
          start,
          end,
        },
      },
    },
    APM_ERROR_CORRELATION_SEARCH_STRATEGY
  );

  const {
    ccsWarning,
    log,
    error,
    isRunning,
    progress,
    startFetch,
    cancelFetch,
  } = result;
  // start fetching on load
  // we want this effect to execute exactly once after the component mounts
  useEffect(() => {
    startFetch();

    return () => {
      // cancel any running async partial request when unmounting the component
      // we want this effect to execute exactly once after the component mounts
      cancelFetch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [
    selectedSignificantTerm,
    setSelectedSignificantTerm,
  ] = useState<ErrorCorrelationValue | null>(null);

  const selectedTerm = useMemo(() => {
    if (selectedSignificantTerm) return selectedSignificantTerm;
    return result?.response?.values &&
      Array.isArray(result.response.values) &&
      result.response.values.length > 0
      ? result.response?.values[0]
      : undefined;
  }, [selectedSignificantTerm, result]);

  const errorCorrelationsColumns: Array<
    EuiBasicTableColumn<ErrorCorrelationValue>
  > = useMemo(
    () => [
      {
        width: '125px',
        field: 'normalized_score',
        name: (
          <>
            {i18n.translate(
              'xpack.apm.correlations.failure.correlationsTable.pValueLabel',
              {
                defaultMessage: 'Score',
              }
            )}
          </>
        ),
        render: (normalizedScore: number) => {
          return (
            <>
              <ImpactBar size="m" value={normalizedScore * 100} />
            </>
          );
        },
      },
      {
        width: '116px',
        field: 'p_value',
        name: (
          <>
            {i18n.translate(
              'xpack.apm.correlations.failure.correlationsTable.impactLabel',
              {
                defaultMessage: 'Impact',
              }
            )}
          </>
        ),
        render: getFailedTransactionsImpactLabel,
      },
      {
        field: 'fieldName',
        name: i18n.translate(
          'xpack.apm.correlations.failure.correlationsTable.fieldNameLabel',
          { defaultMessage: 'Field name' }
        ),
      },
      {
        field: 'key',
        name: i18n.translate(
          'xpack.apm.correlations.failure.correlationsTable.fieldValueLabel',
          { defaultMessage: 'Field value' }
        ),
        render: (fieldValue: string) => String(fieldValue).slice(0, 50),
      },
    ],
    []
  );

  useEffect(() => {
    if (isErrorMessage(error)) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.apm.correlations.failure.errorTitle', {
          defaultMessage:
            'An error occurred performing correlations on failed transactions',
        }),
        text: error.toString(),
      });
    }
  }, [error, notifications.toasts]);
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          {!isRunning && (
            <EuiButton size="s" onClick={startFetch}>
              <FormattedMessage
                id="xpack.apm.correlations.failure.refreshButtonTitle"
                defaultMessage="Refresh"
              />
            </EuiButton>
          )}
          {isRunning && (
            <EuiButton size="s" onClick={cancelFetch}>
              <FormattedMessage
                id="xpack.apm.correlations.failure.cancelButtonTitle"
                defaultMessage="Cancel"
              />
            </EuiButton>
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem data-test-subj="apmCorrelationsfailedTransactionsCorrelationsProgressTitle">
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  data-test-subj="apmCorrelationsfailedTransactionsCorrelationsProgressTitle"
                  id="xpack.apm.correlations.failure.progressTitle"
                  defaultMessage="Progress: {progress}%"
                  values={{ progress: Math.round(progress * 100) }}
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiProgress
                aria-label={i18n.translate(
                  'xpack.apm.correlations.failure.progressAriaLabel',
                  { defaultMessage: 'Progress' }
                )}
                value={Math.round(progress * 100)}
                max={100}
                size="m"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LatencyCorrelationsHelpPopover />
        </EuiFlexItem>
      </EuiFlexGroup>
      {selectedTerm ? (
        <>
          <Summary
            items={[
              <EuiBadge color="hollow">
                {`${selectedTerm.fieldName}: ${selectedTerm.key}`}
              </EuiBadge>,
              `p-value: ${
                selectedTerm.p_value !== null && selectedTerm.p_value < 0.00001
                  ? '<.00001'
                  : asPreciseDecimal(selectedTerm.p_value, 4)
              }`,
            ]}
          />
          <EuiSpacer size="m" />
        </>
      ) : null}
      <CorrelationsTable<ErrorCorrelationValue>
        columns={errorCorrelationsColumns}
        significantTerms={result?.response?.values}
        status={FETCH_STATUS.SUCCESS}
        setSelectedSignificantTerm={setSelectedSignificantTerm}
        selectedTerm={selectedTerm}
        onFilter={onClose}
      />

      {ccsWarning && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={i18n.translate(
              'xpack.apm.correlations.failure.ccsWarningCalloutTitle',
              {
                defaultMessage: 'Cross-cluster search compatibility',
              }
            )}
            color="warning"
          >
            <p>
              {i18n.translate(
                'xpack.apm.correlations.failure.ccsWarningCalloutBody',
                {
                  defaultMessage:
                    'Data for the correlation analysis could not be fully retrieved. This feature is supported only for 7.14 and later versions.',
                }
              )}
            </p>
          </EuiCallOut>
        </>
      )}
      <EuiSpacer size="m" />

      {log.length > 0 && displayLog && (
        <EuiAccordion
          id="accordion1"
          buttonContent={i18n.translate(
            'xpack.apm.correlations.failure.logButtonContent',
            {
              defaultMessage: 'Log',
            }
          )}
        >
          <EuiPanel color="subdued">
            {log.map((d, i) => {
              const splitItem = d.split(': ');
              return (
                <p key={i}>
                  <small>
                    <EuiCode>{splitItem[0]}</EuiCode> {splitItem[1]}
                  </small>
                </p>
              );
            })}
          </EuiPanel>
        </EuiAccordion>
      )}
    </>
  );
}
