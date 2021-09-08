/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { defaults, omit } from 'lodash';
import React from 'react';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import { asInteger } from '../../../../common/utils/formatters';
import { useEnvironmentsFetcher } from '../../../hooks/use_environments_fetcher';
import { useFetcher } from '../../../hooks/use_fetcher';
import { ChartPreview } from '../chart_preview';
import { EnvironmentField, IsAboveField, ServiceField } from '../fields';
import { AlertMetadata, getAbsoluteTimeRange } from '../helper';
import { ServiceAlertTrigger } from '../service_alert_trigger';

export interface AlertParams {
  windowSize: number;
  windowUnit: string;
  threshold: number;
  serviceName: string;
  environment: string;
}

interface Props {
  alertParams: AlertParams;
  metadata?: AlertMetadata;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function ErrorCountAlertTrigger(props: Props) {
  const { alertParams, metadata, setAlertParams, setAlertProperty } = props;

  const { environmentOptions } = useEnvironmentsFetcher({
    serviceName: metadata?.serviceName,
    start: metadata?.start,
    end: metadata?.end,
  });

  const params = defaults(
    { ...omit(metadata, ['start', 'end']), ...alertParams },
    {
      threshold: 25,
      windowSize: 1,
      windowUnit: 'm',
      environment: ENVIRONMENT_ALL.value,
    }
  );

  const { data } = useFetcher(
    (callApmApi) => {
      if (params.windowSize && params.windowUnit) {
        return callApmApi({
          endpoint: 'GET /api/apm/alerts/chart_preview/transaction_error_count',
          params: {
            query: {
              ...getAbsoluteTimeRange(params.windowSize, params.windowUnit),
              environment: params.environment,
              serviceName: params.serviceName,
            },
          },
        });
      }
    },
    [
      params.windowSize,
      params.windowUnit,
      params.environment,
      params.serviceName,
    ]
  );

  const fields = [
    <ServiceField value={params.serviceName} />,
    <EnvironmentField
      currentValue={params.environment}
      options={environmentOptions}
      onChange={(e) => setAlertParams('environment', e.target.value)}
    />,
    <IsAboveField
      value={params.threshold}
      unit={i18n.translate('xpack.apm.errorCountAlertTrigger.errors', {
        defaultMessage: ' errors',
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

  const chartPreview = (
    <ChartPreview
      data={data?.errorCountChartPreview}
      threshold={params.threshold}
      yTickFormat={asInteger}
    />
  );

  return (
    <ServiceAlertTrigger
      defaults={params}
      fields={fields}
      setAlertParams={setAlertParams}
      setAlertProperty={setAlertProperty}
      chartPreview={chartPreview}
    />
  );
}

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default ErrorCountAlertTrigger;
