/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFieldNumber, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { map } from 'lodash';
import React from 'react';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import {
  ALERT_TYPES_CONFIG,
  TRANSACTION_ALERT_AGGREGATION_TYPES,
} from '../../../../common/alert_types';
import { useEnvironments } from '../../../hooks/useEnvironments';
import { useServiceTransactionTypes } from '../../../hooks/useServiceTransactionTypes';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { ServiceAlertTrigger } from '../ServiceAlertTrigger';
import { PopoverExpression } from '../ServiceAlertTrigger/PopoverExpression';
import {
  ENVIRONMENT_ALL,
  getEnvironmentLabel,
} from '../../../../common/environment_filter_values';

interface Params {
  windowSize: number;
  windowUnit: string;
  threshold: number;
  aggregationType: 'avg' | '95th' | '99th';
  serviceName: string;
  transactionType: string;
  environment: string;
}

interface Props {
  alertParams: Params;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function TransactionDurationAlertTrigger(props: Props) {
  const { setAlertParams, alertParams, setAlertProperty } = props;

  const { urlParams } = useUrlParams();

  const transactionTypes = useServiceTransactionTypes(urlParams);

  const { serviceName, start, end } = urlParams;
  const { environmentOptions } = useEnvironments({ serviceName, start, end });

  if (!transactionTypes.length) {
    return null;
  }

  const defaults = {
    threshold: 1500,
    aggregationType: 'avg',
    windowSize: 5,
    windowUnit: 'm',
    transactionType: transactionTypes[0],
    environment: urlParams.environment || ENVIRONMENT_ALL.value,
  };

  const params = {
    ...defaults,
    ...alertParams,
  };

  const fields = [
    <PopoverExpression
      value={getEnvironmentLabel(params.environment)}
      title={i18n.translate(
        'xpack.apm.transactionDurationAlertTrigger.environment',
        {
          defaultMessage: 'Environment',
        }
      )}
    >
      <EuiSelect
        value={params.environment}
        options={environmentOptions}
        onChange={(e) =>
          setAlertParams('environment', e.target.value as Params['environment'])
        }
        compressed
      />
    </PopoverExpression>,
    <PopoverExpression
      value={params.transactionType}
      title={i18n.translate('xpack.apm.transactionDurationAlertTrigger.type', {
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
            e.target.value as Params['transactionType']
          )
        }
        compressed
      />
    </PopoverExpression>,
    <PopoverExpression
      value={params.aggregationType}
      title={i18n.translate('xpack.apm.transactionDurationAlertTrigger.when', {
        defaultMessage: 'When',
      })}
    >
      <EuiSelect
        value={params.aggregationType}
        options={map(TRANSACTION_ALERT_AGGREGATION_TYPES, (label, key) => {
          return {
            text: label,
            value: key,
          };
        })}
        onChange={(e) =>
          setAlertParams(
            'aggregationType',
            e.target.value as Params['aggregationType']
          )
        }
        compressed
      />
    </PopoverExpression>,
    <PopoverExpression
      value={params.threshold ? `${params.threshold}ms` : ''}
      title={i18n.translate(
        'xpack.apm.transactionDurationAlertTrigger.isAbove',
        {
          defaultMessage: 'is above',
        }
      )}
    >
      <EuiFieldNumber
        value={params.threshold ?? ''}
        onChange={(e) => setAlertParams('threshold', e.target.value)}
        append={i18n.translate('xpack.apm.transactionDurationAlertTrigger.ms', {
          defaultMessage: 'ms',
        })}
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
      alertTypeName={ALERT_TYPES_CONFIG['apm.transaction_duration'].name}
      fields={fields}
      defaults={defaults}
      setAlertParams={setAlertParams}
      setAlertProperty={setAlertProperty}
    />
  );
}

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default TransactionDurationAlertTrigger;
