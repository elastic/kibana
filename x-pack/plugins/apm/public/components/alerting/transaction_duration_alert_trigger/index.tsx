/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { defaults, map, omit } from 'lodash';
import React from 'react';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { CoreStart } from '../../../../../../../src/core/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import { getDurationFormatter } from '../../../../common/utils/formatters';
import { useServiceTransactionTypesFetcher } from '../../../context/apm_service/use_service_transaction_types_fetcher';
import { useEnvironmentsFetcher } from '../../../hooks/use_environments_fetcher';
import { useFetcher } from '../../../hooks/use_fetcher';
import { createCallApmApi } from '../../../services/rest/createCallApmApi';
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
import { AlertMetadata, getAbsoluteTimeRange } from '../helper';
import { ServiceAlertTrigger } from '../service_alert_trigger';
import { PopoverExpression } from '../service_alert_trigger/popover_expression';

export interface AlertParams {
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
  alertParams: AlertParams;
  metadata?: AlertMetadata;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function TransactionDurationAlertTrigger(props: Props) {
  const { services } = useKibana();
  const { alertParams, metadata, setAlertParams, setAlertProperty } = props;

  createCallApmApi(services as CoreStart);

  const transactionTypes = useServiceTransactionTypesFetcher(
    metadata?.serviceName
  );

  const params = defaults(
    {
      ...omit(metadata, ['start', 'end']),
      ...alertParams,
    },
    {
      aggregationType: 'avg',
      threshold: 1500,
      windowSize: 5,
      windowUnit: 'm',
      environment: ENVIRONMENT_ALL.value,
      transactionType: transactionTypes[0],
    }
  );

  const { environmentOptions } = useEnvironmentsFetcher({
    serviceName: params.serviceName,
    start: metadata?.start,
    end: metadata?.end,
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

  if (!params.serviceName) {
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
