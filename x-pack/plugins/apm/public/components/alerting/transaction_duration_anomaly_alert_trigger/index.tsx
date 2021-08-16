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
import { ANOMALY_SEVERITY } from '../../../../common/ml_constants';
import { useServiceTransactionTypesFetcher } from '../../../context/apm_service/use_service_transaction_types_fetcher';
import { useEnvironmentsFetcher } from '../../../hooks/use_environments_fetcher';
import {
  EnvironmentField,
  ServiceField,
  TransactionTypeField,
} from '../fields';
import { AlertMetadata } from '../helper';
import { ServiceAlertTrigger } from '../service_alert_trigger';
import { PopoverExpression } from '../service_alert_trigger/popover_expression';
import {
  AnomalySeverity,
  SelectAnomalySeverity,
} from './select_anomaly_severity';

interface AlertParams {
  anomalySeverityType:
    | ANOMALY_SEVERITY.CRITICAL
    | ANOMALY_SEVERITY.MAJOR
    | ANOMALY_SEVERITY.MINOR
    | ANOMALY_SEVERITY.WARNING;
  environment: string;
  serviceName?: string;
  transactionType?: string;
  windowSize: number;
  windowUnit: string;
}

interface Props {
  alertParams: AlertParams;
  metadata?: AlertMetadata;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function TransactionDurationAnomalyAlertTrigger(props: Props) {
  const { alertParams, metadata, setAlertParams, setAlertProperty } = props;

  const transactionTypes = useServiceTransactionTypesFetcher(
    metadata?.serviceName
  );

  const params = defaults(
    {
      ...omit(metadata, ['start', 'end']),
      ...alertParams,
    },
    {
      windowSize: 15,
      windowUnit: 'm',
      anomalySeverityType: ANOMALY_SEVERITY.CRITICAL,
      environment: ENVIRONMENT_ALL.value,
    }
  );

  const { environmentOptions } = useEnvironmentsFetcher({
    serviceName: params.serviceName,
    start: metadata?.start,
    end: metadata?.end,
  });

  const fields = [
    <ServiceField value={params.serviceName} />,
    <TransactionTypeField
      currentValue={params.transactionType}
      options={transactionTypes.map((key) => ({ text: key, value: key }))}
      onChange={(e) => setAlertParams('transactionType', e.target.value)}
    />,
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
      fields={fields}
      defaults={params}
      setAlertParams={setAlertParams}
      setAlertProperty={setAlertProperty}
    />
  );
}

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default TransactionDurationAnomalyAlertTrigger;
