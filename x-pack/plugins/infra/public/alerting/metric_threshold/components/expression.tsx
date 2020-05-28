/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { debounce, pick } from 'lodash';
import * as rt from 'io-ts';
import { HttpSetup } from 'src/core/public';
import React, { ChangeEvent, useCallback, useMemo, useEffect, useState } from 'react';
import {
  EuiSpacer,
  EuiText,
  EuiFormRow,
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiToolTip,
  EuiIcon,
  EuiFieldSearch,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  Comparator,
  Aggregators,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../server/lib/alerting/metric_threshold/types';
import {
  INFRA_ALERT_PREVIEW_PATH,
  alertPreviewRequestParamsRT,
  alertPreviewSuccessResponsePayloadRT,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../server/routes/alerting/preview';
import {
  ForLastExpression,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../triggers_actions_ui/public/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../../triggers_actions_ui/public/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertsContextValue } from '../../../../../triggers_actions_ui/public/application/context/alerts_context';
import { MetricsExplorerKueryBar } from '../../../pages/metrics/metrics_explorer/components/kuery_bar';
import { MetricsExplorerOptions } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { MetricsExplorerGroupBy } from '../../../pages/metrics/metrics_explorer/components/group_by';
import { useSourceViaHttp } from '../../../containers/source/use_source_via_http';
import { convertKueryToElasticSearchQuery } from '../../../utils/kuery';

import { ExpressionRow } from './expression_row';
import { AlertContextMeta, TimeUnit, MetricExpression } from '../types';
import { ExpressionChart } from './expression_chart';
import { validateMetricThreshold } from './validation';

const FILTER_TYPING_DEBOUNCE_MS = 500;

interface Props {
  errors: IErrorObject[];
  alertParams: {
    criteria: MetricExpression[];
    groupBy?: string;
    filterQuery?: string;
    sourceId?: string;
    filterQueryText?: string;
    alertOnNoData?: boolean;
  };
  alertsContext: AlertsContextValue<AlertContextMeta>;
  setAlertParams(key: string, value: any): void;
  setAlertProperty(key: string, value: any): void;
}

const defaultExpression = {
  aggType: Aggregators.AVERAGE,
  comparator: Comparator.GT,
  threshold: [],
  timeSize: 1,
  timeUnit: 'm',
} as MetricExpression;

async function getAlertPreview({
  fetch,
  params,
}: {
  fetch: HttpSetup['fetch'];
  params: rt.TypeOf<typeof alertPreviewRequestParamsRT>;
}): Promise<rt.TypeOf<typeof alertPreviewSuccessResponsePayloadRT>> {
  return await fetch(`${INFRA_ALERT_PREVIEW_PATH}`, {
    method: 'POST',
    body: JSON.stringify({
      ...params,
      alertType: METRIC_THRESHOLD_ALERT_TYPE_ID,
    }),
  });
}

export const Expressions: React.FC<Props> = (props) => {
  const { setAlertParams, alertParams, errors, alertsContext } = props;
  const { source, createDerivedIndexPattern } = useSourceViaHttp({
    sourceId: 'default',
    type: 'metrics',
    fetch: alertsContext.http.fetch,
    toastWarning: alertsContext.toastNotifications.addWarning,
  });

  const [previewLookbackInterval, setPreviewLookbackInterval] = useState<string>('h');
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<boolean>(false);
  const [previewResult, setPreviewResult] = useState<rt.TypeOf<
    typeof alertPreviewSuccessResponsePayloadRT
  > | null>(null);

  const [timeSize, setTimeSize] = useState<number | undefined>(1);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('m');
  const derivedIndexPattern = useMemo(() => createDerivedIndexPattern('metrics'), [
    createDerivedIndexPattern,
  ]);

  const options = useMemo<MetricsExplorerOptions>(() => {
    if (alertsContext.metadata?.currentOptions?.metrics) {
      return alertsContext.metadata.currentOptions as MetricsExplorerOptions;
    } else {
      return {
        metrics: [],
        aggregation: 'avg',
      };
    }
  }, [alertsContext.metadata]);

  const updateParams = useCallback(
    (id, e: MetricExpression) => {
      const exp = alertParams.criteria ? alertParams.criteria.slice() : [];
      exp[id] = { ...exp[id], ...e };
      setAlertParams('criteria', exp);
    },
    [setAlertParams, alertParams.criteria]
  );

  const addExpression = useCallback(() => {
    const exp = alertParams.criteria?.slice() || [];
    exp.push({
      ...defaultExpression,
      timeSize: timeSize ?? defaultExpression.timeSize,
      timeUnit: timeUnit ?? defaultExpression.timeUnit,
    });
    setAlertParams('criteria', exp);
  }, [setAlertParams, alertParams.criteria, timeSize, timeUnit]);

  const removeExpression = useCallback(
    (id: number) => {
      const exp = alertParams.criteria?.slice() || [];
      if (exp.length > 1) {
        exp.splice(id, 1);
        setAlertParams('criteria', exp);
      }
    },
    [setAlertParams, alertParams.criteria]
  );

  const onFilterChange = useCallback(
    (filter: any) => {
      setAlertParams('filterQueryText', filter);
      setAlertParams(
        'filterQuery',
        convertKueryToElasticSearchQuery(filter, derivedIndexPattern) || ''
      );
    },
    [setAlertParams, derivedIndexPattern]
  );

  const debouncedOnFilterChange = useCallback(debounce(onFilterChange, FILTER_TYPING_DEBOUNCE_MS), [
    onFilterChange,
  ]);

  const onGroupByChange = useCallback(
    (group: string | null | string[]) => {
      setAlertParams('groupBy', group || '');
    },
    [setAlertParams]
  );

  const emptyError = useMemo(() => {
    return {
      aggField: [],
      timeSizeUnit: [],
      timeWindowSize: [],
    };
  }, []);

  const updateTimeSize = useCallback(
    (ts: number | undefined) => {
      const criteria =
        alertParams.criteria?.map((c) => ({
          ...c,
          timeSize: ts,
        })) || [];
      setTimeSize(ts || undefined);
      setAlertParams('criteria', criteria);
    },
    [alertParams.criteria, setAlertParams]
  );

  const updateTimeUnit = useCallback(
    (tu: string) => {
      const criteria =
        alertParams.criteria?.map((c) => ({
          ...c,
          timeUnit: tu,
        })) || [];
      setTimeUnit(tu as TimeUnit);
      setAlertParams('criteria', criteria);
    },
    [alertParams.criteria, setAlertParams]
  );

  const preFillAlertCriteria = useCallback(() => {
    const md = alertsContext.metadata;
    if (md && md.currentOptions?.metrics) {
      setAlertParams(
        'criteria',
        md.currentOptions.metrics.map((metric) => ({
          metric: metric.field,
          comparator: Comparator.GT,
          threshold: [],
          timeSize,
          timeUnit,
          aggType: metric.aggregation,
        }))
      );
    } else {
      setAlertParams('criteria', [defaultExpression]);
    }
  }, [alertsContext.metadata, setAlertParams, timeSize, timeUnit]);

  const preFillAlertFilter = useCallback(() => {
    const md = alertsContext.metadata;
    if (md && md.currentOptions?.filterQuery) {
      setAlertParams('filterQueryText', md.currentOptions.filterQuery);
      setAlertParams(
        'filterQuery',
        convertKueryToElasticSearchQuery(md.currentOptions.filterQuery, derivedIndexPattern) || ''
      );
    } else if (md && md.currentOptions?.groupBy && md.series) {
      const { groupBy } = md.currentOptions;
      const filter = Array.isArray(groupBy)
        ? groupBy.map((field, index) => `${field}: "${md.series?.keys?.[index]}"`).join(' and ')
        : `${groupBy}: "${md.series.id}"`;
      setAlertParams('filterQueryText', filter);
      setAlertParams(
        'filterQuery',
        convertKueryToElasticSearchQuery(filter, derivedIndexPattern) || ''
      );
    }
  }, [alertsContext.metadata, derivedIndexPattern, setAlertParams]);

  useEffect(() => {
    if (alertParams.criteria && alertParams.criteria.length) {
      setTimeSize(alertParams.criteria[0].timeSize);
      setTimeUnit(alertParams.criteria[0].timeUnit);
    } else {
      preFillAlertCriteria();
    }

    if (!alertParams.filterQuery) {
      preFillAlertFilter();
    }

    if (!alertParams.sourceId) {
      setAlertParams('sourceId', source?.id || 'default');
    }
  }, [alertsContext.metadata, defaultExpression, source]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFieldSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onFilterChange(e.target.value),
    [onFilterChange]
  );

  const isPreviewDisabled = useMemo(() => {
    const validationResult = validateMetricThreshold({ criteria: alertParams.criteria } as any);
    return Object.values(validationResult.errors).some((result) =>
      Object.values(result).some((arr) => Array.isArray(arr) && arr.length)
    );
  }, [alertParams.criteria]);

  return (
    <>
      <EuiSpacer size={'m'} />
      <EuiText size="xs">
        <h4>
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.conditions"
            defaultMessage="Conditions"
          />
        </h4>
      </EuiText>
      <EuiSpacer size={'xs'} />
      {alertParams.criteria &&
        alertParams.criteria.map((e, idx) => {
          return (
            <ExpressionRow
              canDelete={(alertParams.criteria && alertParams.criteria.length > 1) || false}
              fields={derivedIndexPattern.fields}
              remove={removeExpression}
              addExpression={addExpression}
              key={idx} // idx's don't usually make good key's but here the index has semantic meaning
              expressionId={idx}
              setAlertParams={updateParams}
              errors={errors[idx] || emptyError}
              expression={e || {}}
            >
              <ExpressionChart
                expression={e}
                context={alertsContext}
                derivedIndexPattern={derivedIndexPattern}
                source={source}
                filterQuery={alertParams.filterQueryText}
                groupBy={alertParams.groupBy}
              />
            </ExpressionRow>
          );
        })}

      <div style={{ marginLeft: 28 }}>
        <ForLastExpression
          timeWindowSize={timeSize}
          timeWindowUnit={timeUnit}
          errors={emptyError}
          onChangeWindowSize={updateTimeSize}
          onChangeWindowUnit={updateTimeUnit}
        />
      </div>

      <div>
        <EuiButtonEmpty
          color={'primary'}
          iconSide={'left'}
          flush={'left'}
          iconType={'plusInCircleFilled'}
          onClick={addExpression}
        >
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.addCondition"
            defaultMessage="Add condition"
          />
        </EuiButtonEmpty>
      </div>

      <EuiSpacer size={'m'} />
      <EuiCheckbox
        id="metrics-alert-no-data-toggle"
        label={
          <>
            {i18n.translate('xpack.infra.metrics.alertFlyout.alertOnNoData', {
              defaultMessage: "Alert me if there's no data",
            })}{' '}
            <EuiToolTip
              content={i18n.translate('xpack.infra.metrics.alertFlyout.noDataHelpText', {
                defaultMessage:
                  'Enable this to trigger the action if the metric(s) do not report any data over the expected time period, or if the alert fails to query Elasticsearch',
              })}
            >
              <EuiIcon type="questionInCircle" color="subdued" />
            </EuiToolTip>
          </>
        }
        checked={alertParams.alertOnNoData}
        onChange={(e) => setAlertParams('alertOnNoData', e.target.checked)}
      />

      <EuiSpacer size={'m'} />

      <EuiFormRow
        label={i18n.translate('xpack.infra.metrics.alertFlyout.filterLabel', {
          defaultMessage: 'Filter (optional)',
        })}
        helpText={i18n.translate('xpack.infra.metrics.alertFlyout.filterHelpText', {
          defaultMessage: 'Use a KQL expression to limit the scope of your alert trigger.',
        })}
        fullWidth
        compressed
      >
        {(alertsContext.metadata && (
          <MetricsExplorerKueryBar
            derivedIndexPattern={derivedIndexPattern}
            onChange={debouncedOnFilterChange}
            onSubmit={onFilterChange}
            value={alertParams.filterQueryText}
          />
        )) || (
          <EuiFieldSearch
            onChange={handleFieldSearchChange}
            value={alertParams.filterQueryText}
            fullWidth
          />
        )}
      </EuiFormRow>

      <EuiSpacer size={'m'} />
      <EuiFormRow
        label={i18n.translate('xpack.infra.metrics.alertFlyout.createAlertPerText', {
          defaultMessage: 'Create alert per (optional)',
        })}
        helpText={i18n.translate('xpack.infra.metrics.alertFlyout.createAlertPerHelpText', {
          defaultMessage:
            'Create an alert for every unique value. For example: "host.id" or "cloud.region".',
        })}
        fullWidth
        compressed
      >
        <MetricsExplorerGroupBy
          onChange={onGroupByChange}
          fields={derivedIndexPattern.fields}
          options={{
            ...options,
            groupBy: alertParams.groupBy || undefined,
          }}
        />
      </EuiFormRow>

      <EuiSpacer size={'m'} />
      <EuiFormRow
        label={i18n.translate('xpack.infra.metrics.alertFlyout.previewLabel', {
          defaultMessage: 'Preview',
        })}
        fullWidth
        compressed
      >
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiSelect
                id="selectPreviewLookbackInterval"
                value={previewLookbackInterval}
                onChange={(e) => {
                  setPreviewLookbackInterval(e.target.value);
                  setPreviewResult(null);
                }}
                options={previewOptions}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                isLoading={isPreviewLoading}
                isDisabled={isPreviewDisabled}
                onClick={async () => {
                  setIsPreviewLoading(true);
                  setPreviewResult(null);
                  setPreviewError(false);
                  try {
                    const result = await getAlertPreview({
                      fetch: alertsContext.http.fetch,
                      params: {
                        ...pick(alertParams, 'criteria', 'groupBy', 'filterQuery'),
                        sourceId: alertParams.sourceId,
                        lookback: previewLookbackInterval as 'h' | 'd' | 'w' | 'M',
                      },
                    });
                    setPreviewResult(result);
                  } catch (e) {
                    setPreviewError(true);
                  } finally {
                    setIsPreviewLoading(false);
                  }
                }}
              >
                {i18n.translate('xpack.infra.metrics.alertFlyout.testAlertTrigger', {
                  defaultMessage: 'Test alert trigger',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiSpacer size={'s'} />
          </EuiFlexGroup>
          {previewResult && (
            <>
              <EuiSpacer size={'s'} />
              <EuiText>
                <FormattedMessage
                  id="xpack.infra.metrics.alertFlyout.alertPreviewResult"
                  defaultMessage="This alert would have fired {fired} {timeOrTimes} in the past {lookback}"
                  values={{
                    timeOrTimes:
                      previewResult.resultTotals.fired === 1 ? firedTimeLabel : firedTimesLabel,
                    fired: <strong>{previewResult.resultTotals.fired}</strong>,
                    lookback: previewOptions.find((e) => e.value === previewLookbackInterval)
                      ?.shortText,
                  }}
                />{' '}
                {alertParams.groupBy ? (
                  <FormattedMessage
                    id="xpack.infra.metrics.alertFlyout.alertPreviewGroups"
                    defaultMessage="across {numberOfGroups} {groupName}{plural}."
                    values={{
                      numberOfGroups: <strong>{previewResult.numberOfGroups}</strong>,
                      groupName: alertParams.groupBy,
                      plural: previewResult.numberOfGroups !== 1 ? 's' : '',
                    }}
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.infra.metrics.alertFlyout.alertPreviewAllData"
                    defaultMessage="across the entire infrastructure."
                  />
                )}
              </EuiText>
              {alertParams.alertOnNoData && previewResult.resultTotals.noData && (
                <>
                  <EuiSpacer size={'s'} />
                  <EuiText>
                    <FormattedMessage
                      id="xpack.infra.metrics.alertFlyout.alertPreviewNoDataResult"
                      defaultMessage="There were {noData} results of no data."
                      values={{
                        noData: <strong>{previewResult.resultTotals.noData}</strong>,
                      }}
                    />
                  </EuiText>
                </>
              )}
            </>
          )}
          {previewError && (
            <>
              <EuiSpacer size={'s'} />
              <EuiText>
                <FormattedMessage
                  id="xpack.infra.metrics.alertFlyout.alertPreviewError"
                  defaultMessage="An error occurred when trying to preview this alert trigger."
                />
              </EuiText>
            </>
          )}
        </>
      </EuiFormRow>
      <EuiSpacer size={'m'} />
    </>
  );
};

const previewOptions = [
  {
    value: 'h',
    text: i18n.translate('xpack.infra.metrics.alertFlyout.lastHourLabel', {
      defaultMessage: 'Last hour',
    }),
    shortText: i18n.translate('xpack.infra.metrics.alertFlyout.hourLabel', {
      defaultMessage: 'hour',
    }),
  },
  {
    value: 'd',
    text: i18n.translate('xpack.infra.metrics.alertFlyout.lastDayLabel', {
      defaultMessage: 'Last day',
    }),
    shortText: i18n.translate('xpack.infra.metrics.alertFlyout.dayLabel', {
      defaultMessage: 'day',
    }),
  },
  {
    value: 'w',
    text: i18n.translate('xpack.infra.metrics.alertFlyout.lastWeekLabel', {
      defaultMessage: 'Last week',
    }),
    shortText: i18n.translate('xpack.infra.metrics.alertFlyout.weekLabel', {
      defaultMessage: 'week',
    }),
  },
  {
    value: 'M',
    text: i18n.translate('xpack.infra.metrics.alertFlyout.lastMonthLabel', {
      defaultMessage: 'Last month',
    }),
    shortText: i18n.translate('xpack.infra.metrics.alertFlyout.monthLabel', {
      defaultMessage: 'month',
    }),
  },
];

const firedTimeLabel = i18n.translate('xpack.infra.metrics.alertFlyout.firedTime', {
  defaultMessage: 'time',
});
const firedTimesLabel = i18n.translate('xpack.infra.metrics.alertFlyout.firedTimes', {
  defaultMessage: 'times',
});
