/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useParams } from 'react-router-dom';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { asInteger } from '../../../../common/utils/formatters';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useEnvironmentsFetcher } from '../../../hooks/use_environments_fetcher';
import { useFetcher } from '../../../hooks/use_fetcher';
import { callApmApi } from '../../../services/rest/createCallApmApi';
import { ChartPreview } from '../chart_preview';
import { EnvironmentField, IsAboveField, ServiceField } from '../fields';
import { getAbsoluteTimeRange } from '../helper';
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
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function ErrorCountAlertTrigger(props: Props) {
  const { setAlertParams, setAlertProperty, alertParams } = props;
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams } = useUrlParams();
  const { start, end } = urlParams;
  const { environmentOptions } = useEnvironmentsFetcher({
    serviceName,
    start,
    end,
  });

  const { threshold, windowSize, windowUnit, environment } = alertParams;

  const { data } = useFetcher(() => {
    if (windowSize && windowUnit) {
      return callApmApi({
        endpoint: 'GET /api/apm/alerts/chart_preview/transaction_error_count',
        params: {
          query: {
            ...getAbsoluteTimeRange(windowSize, windowUnit),
            environment,
            serviceName,
          },
        },
      });
    }
  }, [windowSize, windowUnit, environment, serviceName]);

  const defaults = {
    threshold: 25,
    windowSize: 1,
    windowUnit: 'm',
    environment: urlParams.environment || ENVIRONMENT_ALL.value,
  };

  const params = {
    ...defaults,
    ...alertParams,
  };

  const fields = [
    <ServiceField value={serviceName} />,
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
    <ChartPreview data={data} threshold={threshold} yTickFormat={asInteger} />
  );

  return (
    <ServiceAlertTrigger
      defaults={defaults}
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
