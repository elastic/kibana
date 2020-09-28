/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ANOMALY_SEVERITY } from '../../../../../ml/common';
import { ALERT_TYPES_CONFIG } from '../../../../common/alert_types';
import { useEnvironments } from '../../../hooks/useEnvironments';
import { useServiceTransactionTypes } from '../../../hooks/useServiceTransactionTypes';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { ServiceAlertTrigger } from '../ServiceAlertTrigger';
import { PopoverExpression } from '../ServiceAlertTrigger/PopoverExpression';
import {
  AnomalySeverity,
  SelectAnomalySeverity,
} from './SelectAnomalySeverity';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../../common/transaction_types';
import {
  EnvironmentField,
  ServiceField,
  TransactionTypeField,
} from '../fields';

interface Params {
  windowSize: number;
  windowUnit: string;
  serviceName: string;
  transactionType: string;
  environment: string;
  anomalySeverityType:
    | ANOMALY_SEVERITY.CRITICAL
    | ANOMALY_SEVERITY.MAJOR
    | ANOMALY_SEVERITY.MINOR
    | ANOMALY_SEVERITY.WARNING;
}

interface Props {
  alertParams: Params;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function TransactionDurationAnomalyAlertTrigger(props: Props) {
  const { setAlertParams, alertParams, setAlertProperty } = props;
  const { urlParams } = useUrlParams();
  const transactionTypes = useServiceTransactionTypes(urlParams);
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { start, end } = urlParams;
  const { environmentOptions } = useEnvironments({ serviceName, start, end });
  const supportedTransactionTypes = transactionTypes.filter((transactionType) =>
    [TRANSACTION_PAGE_LOAD, TRANSACTION_REQUEST].includes(transactionType)
  );

  if (!supportedTransactionTypes.length || !serviceName) {
    return null;
  }

  // 'page-load' for RUM, 'request' otherwise
  const transactionType = supportedTransactionTypes[0];

  const defaults: Params = {
    windowSize: 15,
    windowUnit: 'm',
    transactionType,
    serviceName,
    environment: urlParams.environment || ENVIRONMENT_ALL.value,
    anomalySeverityType: ANOMALY_SEVERITY.CRITICAL,
  };

  const params = {
    ...defaults,
    ...alertParams,
  };

  const fields = [
    <ServiceField value={serviceName} />,
    <TransactionTypeField currentValue={transactionType} />,
    <EnvironmentField
      currentValue={params.environment}
      options={environmentOptions}
      onChange={(e) => setAlertParams('environment', e.target.value)}
    />,
    <PopoverExpression
      value={<AnomalySeverity type={params.anomalySeverityType} />}
      title={i18n.translate(
        'xpack.apm.transactionDurationAnomalyAlertTrigger.anomalySeverity',
        {
          defaultMessage: 'Has anomaly with severity',
        }
      )}
    >
      <SelectAnomalySeverity
        value={params.anomalySeverityType}
        onChange={(value) => {
          setAlertParams('anomalySeverityType', value);
        }}
      />
    </PopoverExpression>,
  ];

  return (
    <ServiceAlertTrigger
      alertTypeName={
        ALERT_TYPES_CONFIG['apm.transaction_duration_anomaly'].name
      }
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
export default TransactionDurationAnomalyAlertTrigger;
