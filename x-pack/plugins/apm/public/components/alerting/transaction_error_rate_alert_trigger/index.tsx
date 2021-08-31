/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaults, omit } from 'lodash';
import React from 'react';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { CoreStart } from '../../../../../../../src/core/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import { asPercent } from '../../../../common/utils/formatters';
import { useServiceTransactionTypesFetcher } from '../../../context/apm_service/use_service_transaction_types_fetcher';
import { useEnvironmentsFetcher } from '../../../hooks/use_environments_fetcher';
import { useFetcher } from '../../../hooks/use_fetcher';
import { createCallApmApi } from '../../../services/rest/createCallApmApi';
import { ChartPreview } from '../chart_preview';
import {
  EnvironmentField,
  IsAboveField,
  ServiceField,
  TransactionTypeField,
} from '../fields';
import { AlertMetadata, getAbsoluteTimeRange } from '../helper';
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
  metadata?: AlertMetadata;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function TransactionErrorRateAlertTrigger(props: Props) {
  const { services } = useKibana();
  const { alertParams, metadata, setAlertParams, setAlertProperty } = props;

  createCallApmApi(services as CoreStart);

  const transactionTypes = useServiceTransactionTypesFetcher(
    metadata?.serviceName
  );

  const params = defaults(
    { ...omit(metadata, ['start', 'end']), ...alertParams },
    {
      threshold: 30,
      windowSize: 5,
      windowUnit: 'm',
      environment: ENVIRONMENT_ALL.value,
    }
  );

  const { environmentOptions } = useEnvironmentsFetcher({
    serviceName: params.serviceName,
    start: metadata?.start,
    end: metadata?.end,
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
