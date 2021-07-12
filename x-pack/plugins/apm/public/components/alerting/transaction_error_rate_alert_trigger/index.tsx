/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { defaults } from 'lodash';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { asPercent } from '../../../../common/utils/formatters';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useEnvironmentsFetcher } from '../../../hooks/use_environments_fetcher';
import { useFetcher } from '../../../hooks/use_fetcher';
import { ChartPreview } from '../chart_preview';
import {
  EnvironmentField,
  IsAboveField,
  ServiceField,
  TransactionTypeField,
} from '../fields';
import { getAbsoluteTimeRange } from '../helper';
import { ServiceAlertTrigger } from '../service_alert_trigger';

interface AlertParams {
  windowSize: number;
  windowUnit: string;
  threshold: number;
  serviceName: string;
  transactionType: string;
  environment: string;
}

interface Props {
  alertParams: AlertParams;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function TransactionErrorRateAlertTrigger(props: Props) {
  const { setAlertParams, alertParams, setAlertProperty } = props;
  const { urlParams } = useUrlParams();
  const {
    transactionType: transactionTypeFromContext,
    transactionTypes,
    serviceName: serviceNameFromContext,
  } = useApmServiceContext();

  const { start, end, environment: environmentFromUrl } = urlParams;

  const params = defaults<Partial<AlertParams>, AlertParams>(
    {
      threshold: 30,
      windowSize: 5,
      windowUnit: 'm',
      transactionType: transactionTypeFromContext,
      environment: environmentFromUrl || ENVIRONMENT_ALL.value,
      serviceName: serviceNameFromContext,
    },
    alertParams
  );

  const { environmentOptions } = useEnvironmentsFetcher({
    serviceName: serviceNameFromContext,
    start,
    end,
  });

  const thresholdAsPercent = (params.threshold ?? 0) / 100;

  const { data } = useFetcher(
    (callApmApi) => {
      if (params.windowSize && params.windowUnit) {
        return callApmApi({
          endpoint: 'GET /api/apm/alerts/chart_preview/transaction_error_rate',
          params: {
            query: {
              ...getAbsoluteTimeRange(params.windowSize, params.windowUnit),
              environment: params.environment,
              serviceName: params.serviceName,
              transactionType: params.transactionType,
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

  if (params.serviceName && !transactionTypes.length) {
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
