/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { debounce, pick } from 'lodash';
import { Unit } from '@elastic/datemath';
import React, { ChangeEvent, useCallback, useMemo, useEffect, useState } from 'react';
import {
  EuiSpacer,
  EuiText,
  EuiFormRow,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiToolTip,
  EuiIcon,
  EuiFieldSearch,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { AlertPreview } from '../../common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import {
  Comparator,
  Aggregators,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
} from '../../../../common/alerting/metrics';
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
import { AlertContextMeta, MetricExpression, AlertParams } from '../types';
import { ExpressionChart } from './expression_chart';
import { validateMetricThreshold } from './validation';

const FILTER_TYPING_DEBOUNCE_MS = 500;

interface Props {
  errors: IErrorObject[];
  alertParams: AlertParams;
  alertsContext: AlertsContextValue<AlertContextMeta>;
  alertInterval: string;
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
export { defaultExpression };

export const Expressions: React.FC<Props> = (props) => {
  const { setAlertParams, alertParams, errors, alertsContext, alertInterval } = props;
  const { source, createDerivedIndexPattern } = useSourceViaHttp({
    sourceId: 'default',
    type: 'metrics',
    fetch: alertsContext.http.fetch,
    toastWarning: alertsContext.toastNotifications.addWarning,
  });

  const [timeSize, setTimeSize] = useState<number | undefined>(1);
  const [timeUnit, setTimeUnit] = useState<Unit>('m');
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
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
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
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [setAlertParams, alertParams.criteria, timeSize, timeUnit]);

  const removeExpression = useCallback(
    (id: number) => {
      const exp = alertParams.criteria?.slice() || [];
      if (exp.length > 1) {
        exp.splice(id, 1);
        setAlertParams('criteria', exp);
      }
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
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

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const debouncedOnFilterChange = useCallback(debounce(onFilterChange, FILTER_TYPING_DEBOUNCE_MS), [
    onFilterChange,
  ]);

  const onGroupByChange = useCallback(
    (group: string | null | string[]) => {
      setAlertParams('groupBy', group && group.length ? group : '');
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
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [alertParams.criteria, setAlertParams]
  );

  const updateTimeUnit = useCallback(
    (tu: string) => {
      const criteria =
        alertParams.criteria?.map((c) => ({
          ...c,
          timeUnit: tu,
        })) || [];
      setTimeUnit(tu as Unit);
      setAlertParams('criteria', criteria);
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
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

  const preFillAlertGroupBy = useCallback(() => {
    const md = alertsContext.metadata;
    if (md && md.currentOptions?.groupBy && !md.series) {
      setAlertParams('groupBy', md.currentOptions.groupBy);
    }
  }, [alertsContext.metadata, setAlertParams]);

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

    if (!alertParams.groupBy) {
      preFillAlertGroupBy();
    }

    if (!alertParams.sourceId) {
      setAlertParams('sourceId', source?.id || 'default');
    }
  }, [alertsContext.metadata, defaultExpression, source]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFieldSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onFilterChange(e.target.value),
    [onFilterChange]
  );

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

      <EuiSpacer size={'m'} />
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
      <AlertPreview
        alertInterval={alertInterval}
        alertType={METRIC_THRESHOLD_ALERT_TYPE_ID}
        alertParams={pick(alertParams as any, 'criteria', 'groupBy', 'filterQuery', 'sourceId')}
        showNoDataResults={alertParams.alertOnNoData}
        validate={validateMetricThreshold}
        fetch={alertsContext.http.fetch}
        groupByDisplayName={alertParams.groupBy}
      />
      <EuiSpacer size={'m'} />
    </>
  );
};

// required for dynamic import
// eslint-disable-next-line import/no-default-export
export default Expressions;
