/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { useHistory, useParams } from 'react-router-dom';

import { sum } from 'd3-array';

import {
  EuiIcon,
  EuiLink,
  EuiBasicTableColumn,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';

import { CorrelationsChart } from './correlations_chart';
import {
  CorrelationsTable,
  SelectedSignificantTerm,
} from './correlations_table';
import { useCorrelations } from './use_correlations';
import { createHref, push } from '../../shared/Links/url_helpers';
import { useUiTracker } from '../../../../../observability/public';

export function roundToDecimalPlace(
  num?: number,
  dp: number = 2
): number | string {
  if (num === undefined) return '';
  if (num % 1 === 0) {
    // no decimal place
    return num;
  }

  if (Math.abs(num) < Math.pow(10, -dp)) {
    return Number.parseFloat(String(num)).toExponential(2);
  }
  const m = Math.pow(10, dp);
  return Math.round(num * m) / m;
}

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
}

export function MlCorrelations({ onClose }: Props) {
  const {
    core: { notifications },
  } = useApmPluginContext();

  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams } = useUrlParams();

  const fetchOptions = {
    ...{
      serviceName,
      ...urlParams,
    },
  };

  const percentileThreshold = 95;

  const {
    error,
    histograms,
    percentileThresholdValue,
    isComplete,
    isRunning,
    progress,
    startFetch,
    cancelFetch,
    overallHistogram,
  } = useCorrelations({
    index: 'apm-*',
    ...{
      ...fetchOptions,
      percentileThreshold,
    },
  });

  // cancel any running async partial request when unmounting the component
  // we want this effect to execute exactly once after the component mounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => cancelFetch, []);

  // start fetching on load
  // we want this effect to execute exactly once after the component mounts
  useEffect(() => {
    startFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isComplete) {
      notifications.toasts.addSuccess('Finished');
    }
  }, [isComplete, notifications.toasts]);

  useEffect(() => {
    if (isErrorMessage(error)) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.apm.correlations.error.title', {
          defaultMessage: 'An error occurred fetching correlations',
        }),
        text: error.toString(),
      });
    }
  }, [error, notifications.toasts]);

  const [
    selectedSignificantTerm,
    setSelectedSignificantTerm,
  ] = useState<SelectedSignificantTerm | null>(null);

  let selectedHistogram = histograms.length > 0 ? histograms[0] : undefined;

  // console.log(
  //   'selectedHistogram',
  //   selectedHistogram,
  //   'selectedHistogram',
  //   overallHistogram
  // );
  if (histograms.length > 0 && selectedSignificantTerm !== null) {
    selectedHistogram = histograms.find(
      (h) =>
        h.field === selectedSignificantTerm.fieldName &&
        h.value === selectedSignificantTerm.fieldValue
    );
  }
  const history = useHistory();
  const trackApmEvent = useUiTracker({ app: 'apm' });

  const mlCorrelationcolumns: Array<
    EuiBasicTableColumn<MlCorrelationsTerms>
  > = [
    {
      width: '116px',
      field: 'correlation',
      name: i18n.translate(
        'xpack.apm.correlations.correlationsTable.mlCorrelationLabel',
        { defaultMessage: 'Correlation' }
      ),
      render: (_: any, term: MlCorrelationsTerms) => {
        return <div>{roundToDecimalPlace(term.correlation, 4)}</div>;
      },
    },
    {
      field: 'ksTest',
      name: i18n.translate(
        'xpack.apm.correlations.correlationsTable.mlKsTestLabel',
        { defaultMessage: 'KS Test' }
      ),
      render: (_: any, term: MlCorrelationsTerms) => {
        return <div>{term.ksTest.toExponential(2)}</div>;
      },
    },
    {
      field: 'fieldName',
      name: i18n.translate(
        'xpack.apm.correlations.correlationsTable.fieldNameLabel',
        { defaultMessage: 'Field name' }
      ),
    },
    {
      field: 'fieldValue',
      name: i18n.translate(
        'xpack.apm.correlations.correlationsTable.fieldValueLabel',
        { defaultMessage: 'Field value' }
      ),
      render: (_: any, term: MlCorrelationsTerms) =>
        String(term.fieldValue).slice(0, 50),
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
            'xpack.apm.correlations.correlationsTable.excludeLabel',
            { defaultMessage: 'Exclude' }
          ),
          description: i18n.translate(
            'xpack.apm.correlations.correlationsTable.excludeDescription',
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
        'xpack.apm.correlations.correlationsTable.actionsLabel',
        { defaultMessage: 'Filter' }
      ),
      render: (_: any, term: MlCorrelationsTerms) => {
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
  ];

  const histogramTerms = useMemo(() => {
    return histograms.map((d) => {
      // all docs for this field/value pair
      const fieldCount = sum(d.histogram.map((h) => h.doc_count));
      // docs for this field/value pair above the percentile threshold
      const valueCount = sum(
        d.histogram
          .filter((h) => h.key > (percentileThresholdValue ?? 0))
          .map((h) => h.doc_count)
      );

      return {
        distribution: [],
        fieldName: d.field,
        fieldValue: d.value,
        score: d.correlation,
        impact: d.correlation,
        ksTest: d.ksTest,
        correlation: d.correlation,
        fieldCount,
        valueCount,
      };
    });
  }, [histograms, percentileThresholdValue]);

  return (
    <>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.apm.correlations.description', {
            defaultMessage:
              'What is slowing down my service? Correlations will help discover a slower performance in a particular cohort of your data.',
          })}
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          {!isRunning && (
            <EuiButton size="s" onClick={startFetch}>
              Reload
            </EuiButton>
          )}
          {isRunning && (
            <EuiButton size="s" onClick={cancelFetch}>
              Cancel
            </EuiButton>
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                Progress: {Math.round(progress * 100)}%
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiProgress
                value={Math.round(progress * 100)}
                max={100}
                size="m"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      {overallHistogram !== undefined ? (
        <>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.apm.correlations.latency.chart.title', {
                defaultMessage: 'Latency distribution',
              })}
            </h4>
          </EuiTitle>

          <CorrelationsChart
            markerPercentile={percentileThreshold}
            markerValue={percentileThresholdValue ?? 0}
            {...selectedHistogram}
            overallHistogram={overallHistogram}
          />

          <EuiSpacer size="s" />
        </>
      ) : null}

      {histograms.length > 0 && selectedHistogram !== undefined && (
        <>
          <CorrelationsTable
            columns={mlCorrelationcolumns}
            percentageColumnName={i18n.translate(
              'xpack.apm.correlations.latency.ksTestColumnName',
              { defaultMessage: 'KS test p value' }
            )}
            significantTerms={histogramTerms}
            status={FETCH_STATUS.SUCCESS}
            setSelectedSignificantTerm={setSelectedSignificantTerm}
            onFilter={onClose}
          />
        </>
      )}
      {histograms.length < 1 && progress > 0.99 ? (
        <>
          <EuiSpacer size="m" />
          <EuiText textAlign="center">
            <FormattedMessage
              id="xpack.apm.correlations.latency.noCorrelationsMsg"
              defaultMessage="No correlations found"
            />
          </EuiText>
        </>
      ) : null}
    </>
  );
}
