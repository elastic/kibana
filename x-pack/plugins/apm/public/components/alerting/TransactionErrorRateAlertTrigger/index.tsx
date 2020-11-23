/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useParams } from 'react-router-dom';
import React from 'react';
import { asPercent } from '../../../../common/utils/formatters';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import { ALERT_TYPES_CONFIG, AlertType } from '../../../../common/alert_types';
import { useEnvironments } from '../../../hooks/useEnvironments';
import { useServiceTransactionTypes } from '../../../hooks/useServiceTransactionTypes';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { ServiceAlertTrigger } from '../ServiceAlertTrigger';

import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import {
  ServiceField,
  TransactionTypeField,
  EnvironmentField,
  IsAboveField,
} from '../fields';
import { useFetcher } from '../../../hooks/useFetcher';
import { callApmApi } from '../../../services/rest/createCallApmApi';
import { getParsedDate } from '../../../context/UrlParamsContext/helpers';
import { ChartPreview } from '../chart_preview';

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
  const transactionTypes = useServiceTransactionTypes(urlParams);
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { start, end, transactionType } = urlParams;
  const { environmentOptions } = useEnvironments({ serviceName, start, end });

  const { threshold, windowSize, windowUnit, environment } = alertParams;

  const { data } = useFetcher(() => {
    if (threshold && windowSize && windowUnit) {
      return callApmApi({
        endpoint: 'GET /api/apm/alerts/chart_preview/transaction_error_rate',
        params: {
          query: {
            start: getParsedDate(`now-${windowSize}${windowUnit}`)!,
            end: getParsedDate('now')!,
            threshold: threshold / 100,
            environment,
            serviceName,
            transactionType,
          },
        },
      });
    }
  }, [
    threshold,
    windowSize,
    windowUnit,
    environment,
    serviceName,
    transactionType,
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
      onChange={(value) => setAlertParams('threshold', value)}
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
    <ChartPreview data={data} yTickFormat={(d: any) => asPercent(d, 1)} />
  );

  return (
    <ServiceAlertTrigger
      alertTypeName={ALERT_TYPES_CONFIG[AlertType.TransactionErrorRate].name}
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
