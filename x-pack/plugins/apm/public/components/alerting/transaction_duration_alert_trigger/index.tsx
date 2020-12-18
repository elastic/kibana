/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { map } from 'lodash';
import React from 'react';
import { useParams } from 'react-router-dom';
import { useFetcher } from '../../../../../observability/public';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { getDurationFormatter } from '../../../../common/utils/formatters';
import { TimeSeries } from '../../../../typings/timeseries';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useEnvironmentsFetcher } from '../../../hooks/use_environments_fetcher';
import { callApmApi } from '../../../services/rest/createCallApmApi';
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
import { getAbsoluteTimeRange } from '../helper';
import { ServiceAlertTrigger } from '../service_alert_trigger';
import { PopoverExpression } from '../service_alert_trigger/popover_expression';

interface AlertParams {
  windowSize: number;
  windowUnit: string;
  threshold: number;
  aggregationType: 'avg' | '95th' | '99th';
  serviceName: string;
  transactionType: string;
  environment: string;
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
  alertParams: AlertParams;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function TransactionDurationAlertTrigger(props: Props) {
  const { setAlertParams, alertParams, setAlertProperty } = props;
  const { urlParams } = useUrlParams();
  const { transactionTypes, transactionType } = useApmServiceContext();
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { start, end } = urlParams;
  const { environmentOptions } = useEnvironmentsFetcher({
    serviceName,
    start,
    end,
  });
  const {
    aggregationType,
    environment,
    threshold,
    windowSize,
    windowUnit,
  } = alertParams;

  const { data } = useFetcher(() => {
    if (windowSize && windowUnit) {
      return callApmApi({
        endpoint: 'GET /api/apm/alerts/chart_preview/transaction_duration',
        params: {
          query: {
            ...getAbsoluteTimeRange(windowSize, windowUnit),
            aggregationType,
            environment,
            serviceName,
            transactionType: alertParams.transactionType,
          },
        },
      });
    }
  }, [
    aggregationType,
    environment,
    serviceName,
    alertParams.transactionType,
    windowSize,
    windowUnit,
  ]);

  const maxY = getMaxY([
    { data: data ?? [] } as TimeSeries<{ x: number; y: number | null }>,
  ]);
  const formatter = getDurationFormatter(maxY);
  const yTickFormat = getResponseTimeTickFormatter(formatter);

  // The threshold from the form is in ms. Convert to µs.
  const thresholdMs = threshold * 1000;

  const chartPreview = (
    <ChartPreview
      data={data}
      threshold={thresholdMs}
      yTickFormat={yTickFormat}
    />
  );

  if (!transactionTypes.length || !serviceName) {
    return null;
  }

  const defaults = {
    threshold: 1500,
    aggregationType: 'avg',
    windowSize: 5,
    windowUnit: 'm',
    transactionType,
    environment: urlParams.environment || ENVIRONMENT_ALL.value,
  };

  const params = {
    ...defaults,
    ...alertParams,
  };

  const fields = [
    <ServiceField value={serviceName} />,
    <TransactionTypeField
      currentValue={params.transactionType}
      options={transactionTypes.map((key) => ({ text: key, value: key }))}
      onChange={(e) => setAlertParams('transactionType', e.target.value)}
    />,
    <EnvironmentField
      currentValue={params.environment}
      options={environmentOptions}
      onChange={(e) => setAlertParams('environment', e.target.value)}
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
        onChange={(e) => setAlertParams('aggregationType', e.target.value)}
        compressed
      />
    </PopoverExpression>,
    <IsAboveField
      value={params.threshold}
      unit={i18n.translate('xpack.apm.transactionDurationAlertTrigger.ms', {
        defaultMessage: 'ms',
      })}
      onChange={(value) => setAlertParams('threshold', value || 0)}
    />,
    <ForLastExpression
      onChangeWindowSize={(timeWindowSize) =>
        setAlertParams('windowSize', timeWindowSize || '')
      }
      onChangeWindowUnit={(timeWindowUnit) =>
        setAlertParams('windowUnit', timeWindowUnit)
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
      defaults={defaults}
      fields={fields}
      setAlertParams={setAlertParams}
      setAlertProperty={setAlertProperty}
    />
  );
}

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default TransactionDurationAlertTrigger;
