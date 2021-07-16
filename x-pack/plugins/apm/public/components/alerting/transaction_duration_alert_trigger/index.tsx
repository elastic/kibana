/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { map, defaults } from 'lodash';
import React from 'react';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { getDurationFormatter } from '../../../../common/utils/formatters';
import { getTransactionType } from '../../../context/apm_service/apm_service_context';
import { useServiceAgentNameFetcher } from '../../../context/apm_service/use_service_agent_name_fetcher';
import { useServiceTransactionTypesFetcher } from '../../../context/apm_service/use_service_transaction_types_fetcher';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useEnvironmentsFetcher } from '../../../hooks/use_environments_fetcher';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useServiceName } from '../../../hooks/use_service_name';
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

  const { start, end, environment: environmentFromUrl } = urlParams;

  const serviceNameFromUrl = useServiceName();

  const transactionTypes = useServiceTransactionTypesFetcher(
    serviceNameFromUrl
  );
  const { agentName } = useServiceAgentNameFetcher(serviceNameFromUrl);

  const transactionTypeFromUrl = getTransactionType({
    transactionType: urlParams.transactionType,
    transactionTypes,
    agentName,
  });

  const params = defaults(
    {
      ...alertParams,
    },
    {
      aggregationType: 'avg',
      environment: environmentFromUrl || ENVIRONMENT_ALL.value,
      threshold: 1500,
      windowSize: 5,
      windowUnit: 'm',
      transactionType: transactionTypeFromUrl,
      serviceName: serviceNameFromUrl,
    }
  );

  const { environmentOptions } = useEnvironmentsFetcher({
    serviceName: params.serviceName,
    start,
    end,
  });

  const { data } = useFetcher(
    (callApmApi) => {
      if (params.windowSize && params.windowUnit) {
        return callApmApi({
          endpoint: 'GET /api/apm/alerts/chart_preview/transaction_duration',
          params: {
            query: {
              ...getAbsoluteTimeRange(params.windowSize, params.windowUnit),
              aggregationType: params.aggregationType,
              environment: params.environment,
              serviceName: params.serviceName,
              transactionType: params.transactionType,
            },
          },
        });
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
    />
  );

  if (!transactionTypes.length || !params.serviceName) {
    return null;
  }

  const fields = [
    <ServiceField value={params.serviceName} />,
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
      defaults={params}
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
