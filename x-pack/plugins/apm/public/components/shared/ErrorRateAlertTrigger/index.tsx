/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFieldNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isFinite } from 'lodash';
import { EuiSelect } from '@elastic/eui';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import { ALERT_TYPES_CONFIG } from '../../../../common/alert_types';
import { ServiceAlertTrigger } from '../ServiceAlertTrigger';
import { PopoverExpression } from '../ServiceAlertTrigger/PopoverExpression';
import { useEnvironments, ALL_OPTION } from '../../../hooks/useEnvironments';
import { useUrlParams } from '../../../hooks/useUrlParams';

export interface ErrorRateAlertTriggerParams {
  windowSize: number;
  windowUnit: string;
  threshold: number;
  environment: string;
}

interface Props {
  alertParams: ErrorRateAlertTriggerParams;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function ErrorRateAlertTrigger(props: Props) {
  const { setAlertParams, setAlertProperty, alertParams } = props;

  const { urlParams } = useUrlParams();
  const { serviceName, start, end } = urlParams;
  const { environmentOptions } = useEnvironments({ serviceName, start, end });

  const defaults = {
    threshold: 25,
    windowSize: 1,
    windowUnit: 'm',
    environment: ALL_OPTION.value,
  };

  const params = {
    ...defaults,
    ...alertParams,
  };

  const threshold = isFinite(params.threshold) ? params.threshold : '';

  const fields = [
    <PopoverExpression
      value={
        params.environment === ALL_OPTION.value
          ? ALL_OPTION.text
          : params.environment
      }
      title={i18n.translate('xpack.apm.errorRateAlertTrigger.environment', {
        defaultMessage: 'Environment',
      })}
    >
      <EuiSelect
        value={params.environment}
        options={environmentOptions}
        onChange={(e) =>
          setAlertParams(
            'environment',
            e.target.value as ErrorRateAlertTriggerParams['environment']
          )
        }
        compressed
      />
    </PopoverExpression>,
    <PopoverExpression
      title={i18n.translate('xpack.apm.errorRateAlertTrigger.isAbove', {
        defaultMessage: 'is above',
      })}
      value={threshold.toString()}
    >
      <EuiFieldNumber
        value={threshold}
        step={0}
        onChange={(e) =>
          setAlertParams('threshold', parseInt(e.target.value, 10))
        }
        compressed
        append={i18n.translate('xpack.apm.errorRateAlertTrigger.errors', {
          defaultMessage: 'errors',
        })}
      />
    </PopoverExpression>,
    <ForLastExpression
      onChangeWindowSize={(windowSize) =>
        setAlertParams('windowSize', windowSize || '')
      }
      onChangeWindowUnit={(windowUnit) =>
        setAlertParams('windowUnit', windowUnit)
      }
      timeWindowSize={params.windowSize}
      timeWindowUnit={params.windowUnit}
      errors={{
        timeWindowSize: [],
        timeWindowUnit: [],
      }}
    />,
  ];

  return (
    <ServiceAlertTrigger
      alertTypeName={ALERT_TYPES_CONFIG['apm.error_rate'].name}
      defaults={defaults}
      fields={fields}
      setAlertParams={setAlertParams}
      setAlertProperty={setAlertProperty}
    />
  );
}

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default ErrorRateAlertTrigger;
