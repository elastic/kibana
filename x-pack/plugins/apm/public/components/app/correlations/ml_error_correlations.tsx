/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { CorrelationsTable } from './correlations_table';
import { enableInspectEsQueries } from '../../../../../observability/public';
import { asPreciseDecimal } from '../../../../common/utils/formatters';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { LatencyCorrelationsHelpPopover } from './ml_latency_correlations_help_popover';
import { useCorrelationsSearchStrategy } from './use_correlations_search_strategy';
import {
  BaseSearchStrategyResponse,
  ErrorCorrelationValue,
} from '../../../../common/search_strategies/error_correlations/types';

export const APM_ERROR_CORRELATION_SS = 'apmErrorCorrelationsSearchStrategy';
const DEFAULT_PERCENTILE_THRESHOLD = 95;
const isErrorMessage = (arg: unknown): arg is Error => {
  return arg instanceof Error;
};

interface Props {
  onClose: () => void;
}

interface ErrorCorrelationSearchStrategyResult
  extends BaseSearchStrategyResponse {
  values: ErrorCorrelationValue[];
}

export function MlErrorCorrelations({ onClose }: Props) {
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
        percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
      },
    },
    APM_ERROR_CORRELATION_SS
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

  const errorCorrelationsColumn: Array<
    EuiBasicTableColumn<ErrorCorrelationValue>
  > = useMemo(
    () => [
      {
        width: '116px',
        field: 'score',
        name: (
          <>
            {i18n.translate(
              'xpack.apm.correlations.errorCorrelations.correlationsTable.scoreLabel',
              {
                defaultMessage: 'Score',
              }
            )}
          </>
        ),
        render: (pValue: number) => {
          return <>{asPreciseDecimal(pValue, 4)}</>;
        },
      },
      {
        width: '116px',
        field: 'p_value',
        name: (
          <>
            {i18n.translate(
              'xpack.apm.correlations.errorCorrelations.correlationsTable.pValueLabel',
              {
                defaultMessage: 'P value',
              }
            )}
          </>
        ),
        render: (pValue: number) => {
          return (
            <>{pValue < 0.0001 ? '<.0001' : asPreciseDecimal(pValue, 4)}</>
          );
        },
      },

      {
        field: 'fieldName',
        name: i18n.translate(
          'xpack.apm.correlations.errorCorrelations.correlationsTable.fieldNameLabel',
          { defaultMessage: 'Field name' }
        ),
      },
      {
        field: 'key',
        name: i18n.translate(
          'xpack.apm.correlations.errorCorrelations.correlationsTable.fieldValueLabel',
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
        title: i18n.translate(
          'xpack.apm.correlations.errorCorrelations.errorTitle',
          {
            defaultMessage: 'An error occurred fetching correlations',
          }
        ),
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
                id="xpack.apm.correlations.errorCorrelations.refreshButtonTitle"
                defaultMessage="Refresh"
              />
            </EuiButton>
          )}
          {isRunning && (
            <EuiButton size="s" onClick={cancelFetch}>
              <FormattedMessage
                id="xpack.apm.correlations.errorCorrelations.cancelButtonTitle"
                defaultMessage="Cancel"
              />
            </EuiButton>
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem data-test-subj="apmCorrelationsLatencyCorrelationsProgressTitle">
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  data-test-subj="apmCorrelationsLatencyCorrelationsProgressTitle"
                  id="xpack.apm.correlations.errorCorrelations.progressTitle"
                  defaultMessage="Progress: {progress}%"
                  values={{ progress: Math.round(progress * 100) }}
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiProgress
                aria-label={i18n.translate(
                  'xpack.apm.correlations.errorCorrelations.progressAriaLabel',
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
      <CorrelationsTable
        // @ts-ignore correlations don't have the same column format other tables have
        columns={errorCorrelationsColumn}
        // @ts-expect-error correlations don't have the same significant term other tables have
        significantTerms={result?.response?.values}
        status={FETCH_STATUS.SUCCESS}
        setSelectedSignificantTerm={() => {}}
        onFilter={onClose}
      />

      {ccsWarning && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={i18n.translate(
              'xpack.apm.correlations.errorCorrelations.ccsWarningCalloutTitle',
              {
                defaultMessage: 'Cross-cluster search compatibility',
              }
            )}
            color="warning"
          >
            <p>
              {i18n.translate(
                'xpack.apm.correlations.errorCorrelations.ccsWarningCalloutBody',
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
            'xpack.apm.correlations.errorCorrelations.logButtonContent',
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
