/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useParams } from 'react-router-dom';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import { ALERT_TYPES_CONFIG, AlertType } from '../../../../common/alert_types';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { getParsedDate } from '../../../context/UrlParamsContext/helpers';
import { useEnvironments } from '../../../hooks/useEnvironments';
import { useFetcher } from '../../../hooks/useFetcher';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { callApmApi } from '../../../services/rest/createCallApmApi';
import { ChartPreview } from '../chart_preview';
import { EnvironmentField, ServiceField, IsAboveField } from '../fields';
import { ServiceAlertTrigger } from '../ServiceAlertTrigger';

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
  const { environmentOptions } = useEnvironments({ serviceName, start, end });

  const { threshold, windowSize, windowUnit, environment } = alertParams;

  const { data } = useFetcher(() => {
    if (threshold && windowSize && windowUnit) {
      return callApmApi({
        endpoint: 'GET /api/apm/alerts/chart_preview/transaction_error_count',
        params: {
          query: {
            start: getParsedDate(`now-${windowSize}${windowUnit}`)!,
            end: getParsedDate('now')!,
            threshold,
            environment,
            serviceName,
          },
        },
      });
    }
  }, [threshold, windowSize, windowUnit, environment, serviceName]);

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
      onChange={(value) => setAlertParams('threshold', value)}
    />,
    <ForLastExpression
      onChangeWindowSize={(_windowSize) =>
        setAlertParams('windowSize', _windowSize || '')
      }
      onChangeWindowUnit={(_windowUnit) =>
        setAlertParams('windowUnit', _windowUnit)
      }
      timeWindowSize={params.windowSize}
      timeWindowUnit={params.windowUnit}
      errors={{
        timeWindowSize: [],
        timeWindowUnit: [],
      }}
    />,
  ];

  const chartPreview = <ChartPreview data={data} />;

  return (
    <ServiceAlertTrigger
      alertTypeName={ALERT_TYPES_CONFIG[AlertType.ErrorCount].name}
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
