/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { defaults, map, omit } from 'lodash';
import React, { useEffect } from 'react';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ForLastExpression } from '@kbn/triggers-actions-ui-plugin/public';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { getDurationFormatter } from '../../../../common/utils/formatters';
import { useFetcher } from '../../../hooks/use_fetcher';
import { createCallApmApi } from '../../../services/rest/create_call_apm_api';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../../shared/charts/transaction_charts/helper';
import { ChartPreview } from '../chart_preview';
import {
  EnvironmentField,
  IsAboveField,
  ServiceField,
  TransactionTypeField,
} from '../fields';
import { AlertMetadata, getIntervalAndTimeRange, TimeUnit } from '../helper';
import { ServiceAlertTrigger } from '../service_alert_trigger';
import { PopoverExpression } from '../service_alert_trigger/popover_expression';

export interface RuleParams {
  aggregationType: 'avg' | '95th' | '99th';
  environment: string;
  serviceName: string;
  threshold: number;
  transactionType: string;
  windowSize: number;
  windowUnit: string;
}

const TRANSACTION_ALERT_AGGREGATION_TYPES = {
  avg: i18n.translate(
    'xpack.apm.transactionDurationAlert.aggregationType.avg',
    {
      defaultMessage: 'Average',
    }
  ),
  '95th': i18n.translate(
    'xpack.apm.transactionDurationAlert.aggregationType.95th',
    {
      defaultMessage: '95th percentile',
    }
  ),
  '99th': i18n.translate(
    'xpack.apm.transactionDurationAlert.aggregationType.99th',
    {
      defaultMessage: '99th percentile',
    }
  ),
};

interface Props {
  ruleParams: RuleParams;
  metadata?: AlertMetadata;
  setRuleParams: (key: string, value: any) => void;
  setRuleProperty: (key: string, value: any) => void;
}

export function TransactionDurationAlertTrigger(props: Props) {
  const { services } = useKibana();
  const { ruleParams, metadata, setRuleParams, setRuleProperty } = props;

  useEffect(() => {
    createCallApmApi(services as CoreStart);
  }, [services]);

  const params = defaults(
    {
      ...omit(metadata, ['start', 'end']),
      ...ruleParams,
    },
    {
      aggregationType: 'avg',
      threshold: 1500,
      windowSize: 5,
      windowUnit: 'm',
      environment: ENVIRONMENT_ALL.value,
    }
  );

  const { data } = useFetcher(
    (callApmApi) => {
      const { interval, start, end } = getIntervalAndTimeRange({
        windowSize: params.windowSize,
        windowUnit: params.windowUnit as TimeUnit,
      });
      if (interval && start && end) {
        return callApmApi(
          'GET /internal/apm/alerts/chart_preview/transaction_duration',
          {
            params: {
              query: {
                aggregationType: params.aggregationType,
                environment: params.environment,
                serviceName: params.serviceName,
                transactionType: params.transactionType,
                interval,
                start,
                end,
              },
            },
          }
        );
      }
    },
    [
      params.aggregationType,
      params.environment,
      params.serviceName,
      params.transactionType,
      params.windowSize,
      params.windowUnit,
    ]
  );

  const latencyChartPreview = data?.latencyChartPreview ?? [];

  const maxY = getMaxY([{ data: latencyChartPreview }]);
  const formatter = getDurationFormatter(maxY);
  const yTickFormat = getResponseTimeTickFormatter(formatter);

  // The threshold from the form is in ms. Convert to µs.
  const thresholdMs = params.threshold * 1000;

  const chartPreview = (
    <ChartPreview
      data={latencyChartPreview}
      threshold={thresholdMs}
      yTickFormat={yTickFormat}
      uiSettings={services.uiSettings}
    />
  );

  const fields = [
    <ServiceField
      allowAll={false}
      currentValue={params.serviceName}
      onChange={(value) => setRuleParams('serviceName', value)}
    />,
    <TransactionTypeField
      currentValue={params.transactionType}
      onChange={(value) => setRuleParams('transactionType', value)}
    />,
    <EnvironmentField
      currentValue={params.environment}
      onChange={(value) => setRuleParams('environment', value)}
    />,
    <PopoverExpression
      value={params.aggregationType}
      title={i18n.translate('xpack.apm.transactionDurationAlertTrigger.when', {
        defaultMessage: 'When',
      })}
    >
      <EuiSelect
        value={params.aggregationType}
        options={map(TRANSACTION_ALERT_AGGREGATION_TYPES, (label, key) => {
          return {
            text: label,
            value: key,
          };
        })}
        onChange={(e) => setRuleParams('aggregationType', e.target.value)}
        compressed
      />
    </PopoverExpression>,
    <IsAboveField
      value={params.threshold}
      unit={i18n.translate('xpack.apm.transactionDurationAlertTrigger.ms', {
        defaultMessage: 'ms',
      })}
      onChange={(value) => setRuleParams('threshold', value || 0)}
    />,
    <ForLastExpression
      onChangeWindowSize={(timeWindowSize) =>
        setRuleParams('windowSize', timeWindowSize || '')
      }
      onChangeWindowUnit={(timeWindowUnit) =>
        setRuleParams('windowUnit', timeWindowUnit)
      }
      timeWindowSize={params.windowSize}
      timeWindowUnit={params.windowUnit}
      errors={{
        timeWindowSize: [],
        timeWindowUnit: [],
      }}
    />,
  ];

  return (
    <ServiceAlertTrigger
      chartPreview={chartPreview}
      defaults={params}
      fields={fields}
      setRuleParams={setRuleParams}
      setRuleProperty={setRuleProperty}
    />
  );
}

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default TransactionDurationAlertTrigger;
