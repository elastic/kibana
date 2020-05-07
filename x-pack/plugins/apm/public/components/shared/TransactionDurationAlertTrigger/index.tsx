/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { map } from 'lodash';
import { EuiFieldNumber, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ForLastExpression } from '../../../../../triggers_actions_ui/public';
import {
  TRANSACTION_ALERT_AGGREGATION_TYPES,
  ALERT_TYPES_CONFIG
} from '../../../../common/alert_types';
import { ServiceAlertTrigger } from '../ServiceAlertTrigger';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useServiceTransactionTypes } from '../../../hooks/useServiceTransactionTypes';
import { PopoverExpression } from '../ServiceAlertTrigger/PopoverExpression';

interface Params {
  windowSize: number;
  windowUnit: string;
  threshold: number;
  aggregationType: 'avg' | '95th' | '99th';
  serviceName: string;
  transactionType: string;
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

  if (!transactionTypes.length) {
    return null;
  }

  const defaults = {
    threshold: 1500,
    aggregationType: 'avg',
    windowSize: 5,
    windowUnit: 'm',
    transactionType: transactionTypes[0]
  };

  const params = {
    ...defaults,
    ...alertParams
  };

  const fields = [
    <PopoverExpression
      value={params.transactionType}
      title={i18n.translate('xpack.apm.transactionDurationAlertTrigger.type', {
        defaultMessage: 'Type'
      })}
    >
      <EuiSelect
        value={params.transactionType}
        options={transactionTypes.map(key => {
          return {
            text: key,
            value: key
          };
        })}
        onChange={e =>
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
        defaultMessage: 'When'
      })}
    >
      <EuiSelect
        value={params.aggregationType}
        options={map(TRANSACTION_ALERT_AGGREGATION_TYPES, (label, key) => {
          return {
            text: label,
            value: key
          };
        })}
        onChange={e =>
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
          defaultMessage: 'is above'
        }
      )}
    >
      <EuiFieldNumber
        value={params.threshold ?? ''}
        onChange={e => setAlertParams('threshold', e.target.value)}
        append={i18n.translate('xpack.apm.transactionDurationAlertTrigger.ms', {
          defaultMessage: 'ms'
        })}
        compressed
      />
    </PopoverExpression>,
    <ForLastExpression
      onChangeWindowSize={timeWindowSize =>
        setAlertParams('windowSize', timeWindowSize || '')
      }
      onChangeWindowUnit={timeWindowUnit =>
        setAlertParams('windowUnit', timeWindowUnit)
      }
      timeWindowSize={params.windowSize}
      timeWindowUnit={params.windowUnit}
      errors={{
        timeWindowSize: [],
        timeWindowUnit: []
      }}
    />
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
