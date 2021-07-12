/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { defaults } from 'lodash';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { asInteger } from '../../../../common/utils/formatters';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useEnvironmentsFetcher } from '../../../hooks/use_environments_fetcher';
import { useFetcher } from '../../../hooks/use_fetcher';
import { ChartPreview } from '../chart_preview';
import { EnvironmentField, IsAboveField, ServiceField } from '../fields';
import { getAbsoluteTimeRange } from '../helper';
import { ServiceAlertTrigger } from '../service_alert_trigger';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';

export interface AlertParams {
  windowSize: number;
  windowUnit: string;
  threshold: number;
  serviceName: string;
  environment: string;
}

interface Props {
  alertParams: AlertParams;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function ErrorCountAlertTrigger(props: Props) {
  const { setAlertParams, setAlertProperty, alertParams } = props;

  const { serviceName: serviceNameFromContext } = useApmServiceContext();

  const { urlParams } = useUrlParams();
  const { start, end, environment: environmentFromUrl } = urlParams;
  const { environmentOptions } = useEnvironmentsFetcher({
    serviceName: serviceNameFromContext,
    start,
    end,
  });

  const params = defaults(
    {
      ...alertParams,
    },
    {
      threshold: 25,
      windowSize: 1,
      windowUnit: 'm',
      environment: environmentFromUrl || ENVIRONMENT_ALL.value,
      serviceName: serviceNameFromContext,
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
