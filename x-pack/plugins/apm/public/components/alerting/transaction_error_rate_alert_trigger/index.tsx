/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { asPercent } from '../../../../common/utils/formatters';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useEnvironmentsFetcher } from '../../../hooks/use_environments_fetcher';
import { useFetcher } from '../../../hooks/use_fetcher';
import { callApmApi } from '../../../services/rest/createCallApmApi';
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
  const { transactionTypes } = useApmServiceContext();
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { start, end, transactionType } = urlParams;
  const { environmentOptions } = useEnvironmentsFetcher({
    serviceName,
    start,
    end,
  });

  const { threshold, windowSize, windowUnit, environment } = alertParams;

  const thresholdAsPercent = (threshold ?? 0) / 100;

  const { data } = useFetcher(() => {
    if (windowSize && windowUnit) {
      return callApmApi({
        endpoint: 'GET /api/apm/alerts/chart_preview/transaction_error_rate',
        params: {
          query: {
            ...getAbsoluteTimeRange(windowSize, windowUnit),
            environment,
            serviceName,
            transactionType: alertParams.transactionType,
          },
        },
      });
    }
  }, [
    alertParams.transactionType,
    environment,
    serviceName,
    windowSize,
    windowUnit,
  ]);

  if (serviceName && !transactionTypes.length) {
    return null;
  }

  const defaultParams = {
    threshold: 30,
    windowSize: 5,
    windowUnit: 'm',
    transactionType: transactionType || transactionTypes[0],
    environment: urlParams.environment || ENVIRONMENT_ALL.value,
  };

  const params = {
    ...defaultParams,
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
      data={data}
      yTickFormat={(d: number | null) => asPercent(d, 1)}
      threshold={thresholdAsPercent}
    />
  );

  return (
    <ServiceAlertTrigger
      fields={fields}
      defaults={defaultParams}
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
