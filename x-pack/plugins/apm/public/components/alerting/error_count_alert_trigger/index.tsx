/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { defaults, omit } from 'lodash';
import React, { useEffect } from 'react';
import { CoreStart } from '../../../../../../../src/core/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { asInteger } from '../../../../common/utils/formatters';
import { useFetcher } from '../../../hooks/use_fetcher';
import { createCallApmApi } from '../../../services/rest/createCallApmApi';
import { ChartPreview } from '../chart_preview';
import { EnvironmentField, IsAboveField, ServiceField } from '../fields';
import { AlertMetadata, getIntervalAndTimeRange, TimeUnit } from '../helper';
import { ServiceAlertTrigger } from '../service_alert_trigger';

export interface AlertParams {
  windowSize?: number;
  windowUnit?: TimeUnit;
  threshold?: number;
  serviceName?: string;
  environment?: string;
}

interface Props {
  alertParams: AlertParams;
  metadata?: AlertMetadata;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function ErrorCountAlertTrigger(props: Props) {
  const { services } = useKibana();
  const { alertParams, metadata, setAlertParams, setAlertProperty } = props;

  useEffect(() => {
    createCallApmApi(services as CoreStart);
  }, [services]);

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
      const { interval, start, end } = getIntervalAndTimeRange({
        windowSize: params.windowSize,
        windowUnit: params.windowUnit as TimeUnit,
      });
      if (interval && start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/alerts/chart_preview/transaction_error_count',
          params: {
            query: {
              environment: params.environment,
              serviceName: params.serviceName,
              interval,
              start,
              end,
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
    <ServiceField
      currentValue={params.serviceName}
      onChange={(value) => setAlertParams('serviceName', value)}
    />,
    <EnvironmentField
      currentValue={params.environment}
      onChange={(value) => setAlertParams('environment', value)}
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
