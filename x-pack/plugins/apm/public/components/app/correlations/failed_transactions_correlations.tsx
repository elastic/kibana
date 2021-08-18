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
  EuiIcon,
  EuiLink,
  EuiTitle,
  EuiBetaBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useHistory } from 'react-router-dom';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { CorrelationsTable } from './correlations_table';
import { enableInspectEsQueries } from '../../../../../observability/public';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { FailedTransactionsCorrelationsHelpPopover } from './failed_transactions_correlations_help_popover';
import { FailedTransactionsCorrelationValue } from '../../../../common/search_strategies/failure_correlations/types';
import { ImpactBar } from '../../shared/ImpactBar';
import { isErrorMessage } from './utils/is_error_message';
import { Summary } from '../../shared/Summary';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { getFailedTransactionsCorrelationImpactLabel } from './utils/get_failed_transactions_correlation_impact_label';
import { createHref, push } from '../../shared/Links/url_helpers';
import { useUiTracker } from '../../../../../observability/public';
import { useFailedTransactionsCorrelationsFetcher } from '../../../hooks/use_failed_transactions_correlations_fetcher';
import { SearchServiceParams } from '../../../../common/search_strategies/correlations/types';
import { useApmParams } from '../../../hooks/use_apm_params';

export function FailedTransactionsCorrelations({
  onFilter,
}: {
  onFilter: () => void;
}) {
  const {
    core: { notifications, uiSettings },
  } = useApmPluginContext();
  const trackApmEvent = useUiTracker({ app: 'apm' });

  const { serviceName, transactionType } = useApmServiceContext();

  const {
    query: { kuery, environment },
  } = useApmParams('/services/:serviceName');

  const { urlParams } = useUrlParams();
  const { transactionName, start, end } = urlParams;

  const displayLog = uiSettings.get<boolean>(enableInspectEsQueries);

  const searchServicePrams: SearchServiceParams = {
    environment,
    kuery,
    serviceName,
    transactionName,
    transactionType,
    start,
    end,
  };

  const result = useFailedTransactionsCorrelationsFetcher(searchServicePrams);

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
  ] = useState<FailedTransactionsCorrelationValue | null>(null);

  const selectedTerm = useMemo(() => {
    if (selectedSignificantTerm) return selectedSignificantTerm;
    return result?.values &&
      Array.isArray(result.values) &&
      result.values.length > 0
      ? result?.values[0]
      : undefined;
  }, [selectedSignificantTerm, result]);

  const history = useHistory();

  const failedTransactionsCorrelationsColumns: Array<
    EuiBasicTableColumn<FailedTransactionsCorrelationValue>
  > = useMemo(
    () => [
      {
        width: '116px',
        field: 'normalizedScore',
        name: (
          <>
            {i18n.translate(
              'xpack.apm.correlations.failedTransactions.correlationsTable.pValueLabel',
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
        field: 'pValue',
        name: (
          <>
            {i18n.translate(
              'xpack.apm.correlations.failedTransactions.correlationsTable.impactLabel',
              {
                defaultMessage: 'Impact',
              }
            )}
          </>
        ),
        render: getFailedTransactionsCorrelationImpactLabel,
      },
      {
        field: 'fieldName',
        name: i18n.translate(
          'xpack.apm.correlations.failedTransactions.correlationsTable.fieldNameLabel',
          { defaultMessage: 'Field name' }
        ),
      },
      {
        field: 'key',
        name: i18n.translate(
          'xpack.apm.correlations.failedTransactions.correlationsTable.fieldValueLabel',
          { defaultMessage: 'Field value' }
        ),
        render: (fieldValue: string) => String(fieldValue).slice(0, 50),
      },
      {
        width: '100px',
        actions: [
          {
            name: i18n.translate(
              'xpack.apm.correlations.correlationsTable.filterLabel',
              { defaultMessage: 'Filter' }
            ),
            description: i18n.translate(
              'xpack.apm.correlations.correlationsTable.filterDescription',
              { defaultMessage: 'Filter by value' }
            ),
            icon: 'plusInCircle',
            type: 'icon',
            onClick: (term: FailedTransactionsCorrelationValue) => {
              push(history, {
                query: {
                  kuery: `${term.fieldName}:"${encodeURIComponent(
                    term.fieldValue
                  )}"`,
                },
              });
              onFilter();
              trackApmEvent({ metric: 'correlations_term_include_filter' });
            },
          },
          {
            name: i18n.translate(
              'xpack.apm.correlations.correlationsTable.excludeLabel',
              { defaultMessage: 'Exclude' }
            ),
            description: i18n.translate(
              'xpack.apm.correlations.correlationsTable.excludeDescription',
              { defaultMessage: 'Filter out value' }
            ),
            icon: 'minusInCircle',
            type: 'icon',
            onClick: (term: FailedTransactionsCorrelationValue) => {
              push(history, {
                query: {
                  kuery: `not ${term.fieldName}:"${encodeURIComponent(
                    term.fieldValue
                  )}"`,
                },
              });
              onFilter();
              trackApmEvent({ metric: 'correlations_term_exclude_filter' });
            },
          },
        ],
        name: i18n.translate(
          'xpack.apm.correlations.correlationsTable.actionsLabel',
          { defaultMessage: 'Filter' }
        ),
        render: (_: unknown, term: FailedTransactionsCorrelationValue) => {
          return (
            <>
              <EuiLink
                href={createHref(history, {
                  query: {
                    kuery: `${term.fieldName}:"${encodeURIComponent(
                      term.fieldValue
                    )}"`,
                  },
                })}
              >
                <EuiIcon type="magnifyWithPlus" />
              </EuiLink>
              &nbsp;/&nbsp;
              <EuiLink
                href={createHref(history, {
                  query: {
                    kuery: `not ${term.fieldName}:"${encodeURIComponent(
                      term.fieldValue
                    )}"`,
                  },
                })}
              >
                <EuiIcon type="magnifyWithMinus" />
              </EuiLink>
            </>
          );
        },
      },
    ],
    [history, onFilter, trackApmEvent]
  );

  useEffect(() => {
    if (isErrorMessage(error)) {
      notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.apm.correlations.failedTransactions.errorTitle',
          {
            defaultMessage:
              'An error occurred performing correlations on failed transactions',
          }
        ),
        text: error.toString(),
      });
    }
  }, [error, notifications.toasts]);
  return (
    <>
      <EuiFlexGroup
        data-test-subj="apmFailedTransactionsCorrelationsTabContent"
        gutterSize="s"
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h5 data-test-subj="apmFailedTransactionsCorrelationsChartTitle">
              {i18n.translate(
                'xpack.apm.correlations.failedTransactions.panelTitle',
                {
                  defaultMessage: 'Failed transactions',
                }
              )}
            </h5>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiBetaBadge
            label={i18n.translate(
              'xpack.apm.transactionDetails.tabs.failedTransactionsCorrelationsBetaLabel',
              {
                defaultMessage: 'Beta',
              }
            )}
            title={i18n.translate(
              'xpack.apm.transactionDetails.tabs.failedTransactionsCorrelationsBetaTitle',
              {
                defaultMessage: 'Failed transaction rate',
              }
            )}
            tooltipContent={i18n.translate(
              'xpack.apm.transactionDetails.tabs.failedTransactionsCorrelationsBetaDescription',
              {
                defaultMessage:
                  'Failed transaction rate is not GA. Please help us by reporting any bugs.',
              }
            )}
            size="s"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          {!isRunning && (
            <EuiButton size="s" onClick={startFetch}>
              <FormattedMessage
                id="xpack.apm.correlations.failedTransactions.refreshButtonTitle"
                defaultMessage="Refresh"
              />
            </EuiButton>
          )}
          {isRunning && (
            <EuiButton size="s" onClick={cancelFetch}>
              <FormattedMessage
                id="xpack.apm.correlations.failedTransactions.cancelButtonTitle"
                defaultMessage="Cancel"
              />
            </EuiButton>
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem data-test-subj="apmCorrelationsFailedTransactionsCorrelationsProgressTitle">
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  data-test-subj="apmCorrelationsFailedTransactionsCorrelationsProgressMessage"
                  id="xpack.apm.correlations.failedTransactions.progressTitle"
                  defaultMessage="Progress: {progress}%"
                  values={{ progress: Math.round(progress * 100) }}
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiProgress
                aria-label={i18n.translate(
                  'xpack.apm.correlations.failedTransactions.progressAriaLabel',
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
          <FailedTransactionsCorrelationsHelpPopover />
        </EuiFlexItem>
      </EuiFlexGroup>
      {selectedTerm?.pValue != null ? (
        <>
          <EuiSpacer size="m" />
          <Summary
            items={[
              <EuiBadge color="hollow">
                {`${selectedTerm.fieldName}: ${selectedTerm.key}`}
              </EuiBadge>,
              <>{`p-value: ${selectedTerm.pValue.toPrecision(3)}`}</>,
            ]}
          />
          <EuiSpacer size="m" />
        </>
      ) : null}
      <CorrelationsTable<FailedTransactionsCorrelationValue>
        columns={failedTransactionsCorrelationsColumns}
        significantTerms={result?.values}
        status={FETCH_STATUS.SUCCESS}
        setSelectedSignificantTerm={setSelectedSignificantTerm}
        selectedTerm={selectedTerm}
      />

      {ccsWarning && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={i18n.translate(
              'xpack.apm.correlations.failedTransactions.ccsWarningCalloutTitle',
              {
                defaultMessage: 'Cross-cluster search compatibility',
              }
            )}
            color="warning"
          >
            <p>
              {i18n.translate(
                'xpack.apm.correlations.failedTransactions.ccsWarningCalloutBody',
                {
                  defaultMessage:
                    'Data for the correlation analysis could not be fully retrieved. This feature is supported only for 7.15 and later versions.',
                }
              )}
            </p>
          </EuiCallOut>
        </>
      )}
      <EuiSpacer size="m" />

      {log.length > 0 && displayLog && (
        <EuiAccordion
          id="apmFailedTransactionsCorrelationsLogAccordion"
          buttonContent={i18n.translate(
            'xpack.apm.correlations.failedTransactions.logButtonContent',
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
