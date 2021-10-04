/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaults, omit } from 'lodash';
import React, { useEffect } from 'react';
import { CoreStart } from '../../../../../../../src/core/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { asPercent } from '../../../../common/utils/formatters';
import { useFetcher } from '../../../hooks/use_fetcher';
import { createCallApmApi } from '../../../services/rest/createCallApmApi';
import { ChartPreview } from '../chart_preview';
import {
  EnvironmentField,
  IsAboveField,
  ServiceField,
  TransactionTypeField,
} from '../fields';
import { AlertMetadata, getIntervalAndTimeRange, TimeUnit } from '../helper';
import { ServiceAlertTrigger } from '../service_alert_trigger';

interface AlertParams {
  windowSize?: number;
  windowUnit?: string;
  threshold?: number;
  serviceName?: string;
  transactionType?: string;
  environment?: string;
}

interface Props {
  alertParams: AlertParams;
  metadata?: AlertMetadata;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function TransactionErrorRateAlertTrigger(props: Props) {
  const { services } = useKibana();
  const { alertParams, metadata, setAlertParams, setAlertProperty } = props;

  useEffect(() => {
    createCallApmApi(services as CoreStart);
  }, [services]);

  const params = defaults(
    { ...omit(metadata, ['start', 'end']), ...alertParams },
    {
      threshold: 30,
      windowSize: 5,
      windowUnit: 'm',
      environment: ENVIRONMENT_ALL.value,
    }
  );

  const thresholdAsPercent = (params.threshold ?? 0) / 100;

  const { data } = useFetcher(
    (callApmApi) => {
      const { interval, start, end } = getIntervalAndTimeRange({
        windowSize: params.windowSize,
        windowUnit: params.windowUnit as TimeUnit,
      });
      if (interval && start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/alerts/chart_preview/transaction_error_rate',
          params: {
            query: {
              environment: params.environment,
              serviceName: params.serviceName,
              transactionType: params.transactionType,
              interval,
              start,
              end,
            },
          },
        });
      }
    },
    [
      params.transactionType,
      params.environment,
      params.serviceName,
      params.windowSize,
      params.windowUnit,
    ]
  );

  const fields = [
    <ServiceField
      currentValue={params.serviceName}
      onChange={(value) => setAlertParams('serviceName', value)}
    />,
    <TransactionTypeField
      currentValue={params.transactionType}
      onChange={(value) => setAlertParams('transactionType', value)}
    />,
    <EnvironmentField
      currentValue={params.environment}
      onChange={(value) => setAlertParams('environment', value)}
    />,
    <IsAboveField
      value={params.threshold}
      unit="%"
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

  const chartPreview = (
    <ChartPreview
      data={data?.errorRateChartPreview}
      yTickFormat={(d: number | null) => asPercent(d, 1)}
      threshold={thresholdAsPercent}
    />
  );

  return (
    <ServiceAlertTrigger
      fields={fields}
      defaults={params}
      setAlertParams={setAlertParams}
      setAlertProperty={setAlertProperty}
      chartPreview={chartPreview}
    />
  );
}

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default TransactionErrorRateAlertTrigger;
