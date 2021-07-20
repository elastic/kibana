/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  EuiCallOut,
  EuiCode,
  EuiAccordion,
  EuiPanel,
  EuiIcon,
  EuiBasicTableColumn,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import {
  CorrelationsChart,
  replaceHistogramDotsWithBars,
} from './correlations_chart';
import {
  CorrelationsTable,
  SelectedSignificantTerm,
} from './correlations_table';
import { useCorrelations } from './use_correlations';
import { push } from '../../shared/Links/url_helpers';
import {
  enableInspectEsQueries,
  useUiTracker,
} from '../../../../../observability/public';
import { asPreciseDecimal } from '../../../../common/utils/formatters';
import { LatencyCorrelationsHelpPopover } from './ml_latency_correlations_help_popover';

const DEFAULT_PERCENTILE_THRESHOLD = 95;
const isErrorMessage = (arg: unknown): arg is Error => {
  return arg instanceof Error;
};

interface Props {
  onClose: () => void;
}

interface MlCorrelationsTerms {
  correlation: number;
  ksTest: number;
  fieldName: string;
  fieldValue: string;
  duplicatedFields?: string[];
}

export function MlLatencyCorrelations({ onClose }: Props) {
  const {
    core: { notifications, uiSettings },
  } = useApmPluginContext();

  const { serviceName } = useParams<{ serviceName: string }>();
  const {
    urlParams: {
      environment,
      kuery,
      transactionName,
      transactionType,
      start,
      end,
    },
  } = useUrlParams();

  const displayLog = uiSettings.get<boolean>(enableInspectEsQueries);

  const {
    ccsWarning,
    log,
    error,
    histograms,
    percentileThresholdValue,
    isRunning,
    progress,
    startFetch,
    cancelFetch,
    overallHistogram: originalOverallHistogram,
  } = useCorrelations({
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
  });

  const overallHistogram = useMemo(
    () => replaceHistogramDotsWithBars(originalOverallHistogram),
    [originalOverallHistogram]
  );

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

  useEffect(() => {
    if (isErrorMessage(error)) {
      notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.apm.correlations.latencyCorrelations.errorTitle',
          {
            defaultMessage: 'An error occurred fetching correlations',
          }
        ),
        text: error.toString(),
      });
    }
  }, [error, notifications.toasts]);

  const [
    selectedSignificantTerm,
    setSelectedSignificantTerm,
  ] = useState<SelectedSignificantTerm | null>(null);

  let selectedHistogram = histograms.length > 0 ? histograms[0] : undefined;

  if (histograms.length > 0 && selectedSignificantTerm !== null) {
    selectedHistogram = histograms.find(
      (h) =>
        h.field === selectedSignificantTerm.fieldName &&
        h.value === selectedSignificantTerm.fieldValue
    );
  }
  const history = useHistory();
  const trackApmEvent = useUiTracker({ app: 'apm' });

  const mlCorrelationColumns: Array<
    EuiBasicTableColumn<MlCorrelationsTerms>
  > = useMemo(
    () => [
      {
        width: '116px',
        field: 'correlation',
        name: (
          <EuiToolTip
            content={i18n.translate(
              'xpack.apm.correlations.latencyCorrelations.correlationsTable.correlationColumnDescription',
              {
                defaultMessage:
                  'The correlation score [0-1] of an attribute; the greater the score, the more an attribute increases latency.',
              }
            )}
          >
            <>
              {i18n.translate(
                'xpack.apm.correlations.latencyCorrelations.correlationsTable.correlationLabel',
                {
                  defaultMessage: 'Correlation',
                }
              )}
              <EuiIcon
                size="s"
                color="subdued"
                type="questionInCircle"
                className="eui-alignTop"
              />
            </>
          </EuiToolTip>
        ),
        render: (correlation: number) => {
          return <div>{asPreciseDecimal(correlation, 2)}</div>;
        },
      },
      {
        field: 'fieldName',
        name: i18n.translate(
          'xpack.apm.correlations.latencyCorrelations.correlationsTable.fieldNameLabel',
          { defaultMessage: 'Field name' }
        ),
      },
      {
        field: 'fieldValue',
        name: i18n.translate(
          'xpack.apm.correlations.latencyCorrelations.correlationsTable.fieldValueLabel',
          { defaultMessage: 'Field value' }
        ),
        render: (fieldValue: string) => String(fieldValue).slice(0, 50),
      },
      {
        width: '100px',
        actions: [
          {
            name: i18n.translate(
              'xpack.apm.correlations.latencyCorrelations.correlationsTable.filterLabel',
              { defaultMessage: 'Filter' }
            ),
            description: i18n.translate(
              'xpack.apm.correlations.latencyCorrelations.correlationsTable.filterDescription',
              { defaultMessage: 'Filter by value' }
            ),
            icon: 'plusInCircle',
            type: 'icon',
            onClick: (term: MlCorrelationsTerms) => {
              push(history, {
                query: {
                  kuery: `${term.fieldName}:"${encodeURIComponent(
                    term.fieldValue
                  )}"`,
                },
              });
              onClose();
              trackApmEvent({ metric: 'correlations_term_include_filter' });
            },
          },
          {
            name: i18n.translate(
              'xpack.apm.correlations.latencyCorrelations.correlationsTable.excludeLabel',
              { defaultMessage: 'Exclude' }
            ),
            description: i18n.translate(
              'xpack.apm.correlations.latencyCorrelations.correlationsTable.excludeDescription',
              { defaultMessage: 'Filter out value' }
            ),
            icon: 'minusInCircle',
            type: 'icon',
            onClick: (term: MlCorrelationsTerms) => {
              push(history, {
                query: {
                  kuery: `not ${term.fieldName}:"${encodeURIComponent(
                    term.fieldValue
                  )}"`,
                },
              });
              onClose();
              trackApmEvent({ metric: 'correlations_term_exclude_filter' });
            },
          },
        ],
        name: i18n.translate(
          'xpack.apm.correlations.latencyCorrelations.correlationsTable.actionsLabel',
          { defaultMessage: 'Filter' }
        ),
      },
    ],
    [history, onClose, trackApmEvent]
  );

  const histogramTerms: MlCorrelationsTerms[] = useMemo(() => {
    return histograms.map((d) => {
      return {
        fieldName: d.field,
        fieldValue: d.value,
        ksTest: d.ksTest,
        correlation: d.correlation,
        duplicatedFields: d.duplicatedFields,
      };
    });
  }, [histograms]);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          {!isRunning && (
            <EuiButton size="s" onClick={startFetch}>
              <FormattedMessage
                id="xpack.apm.correlations.latencyCorrelations.refreshButtonTitle"
                defaultMessage="Refresh"
              />
            </EuiButton>
          )}
          {isRunning && (
            <EuiButton size="s" onClick={cancelFetch}>
              <FormattedMessage
                id="xpack.apm.correlations.latencyCorrelations.cancelButtonTitle"
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
                  id="xpack.apm.correlations.latencyCorrelations.progressTitle"
                  defaultMessage="Progress: {progress}%"
                  values={{ progress: Math.round(progress * 100) }}
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiProgress
                aria-label={i18n.translate(
                  'xpack.apm.correlations.latencyCorrelations.progressAriaLabel',
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

      {ccsWarning && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={i18n.translate(
              'xpack.apm.correlations.latencyCorrelations.ccsWarningCalloutTitle',
              {
                defaultMessage: 'Cross-cluster search compatibility',
              }
            )}
            color="warning"
          >
            <p>
              {i18n.translate(
                'xpack.apm.correlations.latencyCorrelations.ccsWarningCalloutBody',
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
      {overallHistogram !== undefined ? (
        <>
          <EuiTitle size="xxs">
            <h4 data-test-subj="apmCorrelationsLatencyCorrelationsChartTitle">
              {i18n.translate(
                'xpack.apm.correlations.latencyCorrelations.chartTitle',
                {
                  defaultMessage: 'Latency distribution for {name}',
                  values: {
                    name: transactionName ?? serviceName,
                  },
                }
              )}
            </h4>
          </EuiTitle>

          <CorrelationsChart
            markerPercentile={DEFAULT_PERCENTILE_THRESHOLD}
            markerValue={percentileThresholdValue ?? 0}
            {...selectedHistogram}
            overallHistogram={overallHistogram}
          />

          <EuiSpacer size="s" />
        </>
      ) : null}

      <div data-test-subj="apmCorrelationsTable">
        {histograms.length > 0 && selectedHistogram !== undefined && (
          <CorrelationsTable
            // @ts-ignore correlations don't have the same column format other tables have
            columns={mlCorrelationColumns}
            // @ts-expect-error correlations don't have the same significant term other tables have
            significantTerms={histogramTerms}
            status={FETCH_STATUS.SUCCESS}
            setSelectedSignificantTerm={setSelectedSignificantTerm}
            selectedTerm={{
              fieldName: selectedHistogram.field,
              fieldValue: selectedHistogram.value,
            }}
            onFilter={onClose}
          />
        )}
        {histograms.length < 1 && progress > 0.99 ? (
          <>
            <EuiSpacer size="m" />
            <EuiText textAlign="center">
              <FormattedMessage
                id="xpack.apm.correlations.latencyCorrelations.noCorrelationsText"
                defaultMessage="No significant correlations found"
              />
            </EuiText>
          </>
        ) : null}
      </div>
      {log.length > 0 && displayLog && (
        <EuiAccordion
          id="accordion1"
          buttonContent={i18n.translate(
            'xpack.apm.correlations.latencyCorrelations.logButtonContent',
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
