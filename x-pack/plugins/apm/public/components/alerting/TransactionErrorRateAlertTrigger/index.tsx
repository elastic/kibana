/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFieldNumber, EuiSelect, EuiExpression } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import { ALERT_TYPES_CONFIG, AlertType } from '../../../../common/alert_types';
import { useEnvironments } from '../../../hooks/useEnvironments';
import { useServiceTransactionTypes } from '../../../hooks/useServiceTransactionTypes';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { ServiceAlertTrigger } from '../ServiceAlertTrigger';
import { PopoverExpression } from '../ServiceAlertTrigger/PopoverExpression';
import {
  ENVIRONMENT_ALL,
  getEnvironmentLabel,
} from '../../../../common/environment_filter_values';

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

  if (!transactionTypes.length || !serviceName) {
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
    <EuiExpression
      description={i18n.translate(
        'xpack.apm.transactionDurationAnomalyAlertTrigger.service',
        {
          defaultMessage: 'Service',
        }
      )}
      value={serviceName}
    />,
    <PopoverExpression
      value={getEnvironmentLabel(params.environment)}
      title={i18n.translate(
        'xpack.apm.transactionErrorRateAlertTrigger.environment',
        {
          defaultMessage: 'Environment',
        }
      )}
    >
      <EuiSelect
        value={params.environment}
        options={environmentOptions}
        onChange={(e) =>
          setAlertParams(
            'environment',
            e.target.value as AlertParams['environment']
          )
        }
        compressed
      />
    </PopoverExpression>,
    <PopoverExpression
      value={params.transactionType}
      title={i18n.translate('xpack.apm.transactionErrorRateAlertTrigger.type', {
        defaultMessage: 'Type',
      })}
    >
      <EuiSelect
        value={params.transactionType}
        options={transactionTypes.map((key) => {
          return {
            text: key,
            value: key,
          };
        })}
        onChange={(e) =>
          setAlertParams(
            'transactionType',
            e.target.value as AlertParams['transactionType']
          )
        }
        compressed
      />
    </PopoverExpression>,
    <PopoverExpression
      value={params.threshold ? `${params.threshold}%` : ''}
      title={i18n.translate(
        'xpack.apm.transactionErrorRateAlertTrigger.isAbove',
        {
          defaultMessage: 'is above',
        }
      )}
    >
      <EuiFieldNumber
        value={params.threshold ?? ''}
        onChange={(e) => setAlertParams('threshold', e.target.value)}
        append="%"
        compressed
      />
    </PopoverExpression>,
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

  return (
    <ServiceAlertTrigger
      alertTypeName={ALERT_TYPES_CONFIG[AlertType.TransactionErrorRate].name}
      fields={fields}
      defaults={defaultParams}
      setAlertParams={setAlertParams}
      setAlertProperty={setAlertProperty}
    />
  );
}

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default TransactionErrorRateAlertTrigger;
