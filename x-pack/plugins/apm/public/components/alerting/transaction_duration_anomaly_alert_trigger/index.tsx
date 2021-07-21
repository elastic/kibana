/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { defaults } from 'lodash';
import { ANOMALY_SEVERITY } from '../../../../common/ml_constants';
import { useEnvironmentsFetcher } from '../../../hooks/use_environments_fetcher';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { ServiceAlertTrigger } from '../service_alert_trigger';
import { PopoverExpression } from '../service_alert_trigger/popover_expression';
import {
  AnomalySeverity,
  SelectAnomalySeverity,
} from './select_anomaly_severity';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import {
  EnvironmentField,
  ServiceField,
  TransactionTypeField,
} from '../fields';
import { useServiceName } from '../../../hooks/use_service_name';
import { useServiceTransactionTypesFetcher } from '../../../context/apm_service/use_service_transaction_types_fetcher';
import { useServiceAgentNameFetcher } from '../../../context/apm_service/use_service_agent_name_fetcher';
import { getTransactionType } from '../../../context/apm_service/apm_service_context';

interface AlertParams {
  windowSize: number;
  windowUnit: string;
  serviceName?: string;
  transactionType?: string;
  environment: string;
  anomalySeverityType:
    | ANOMALY_SEVERITY.CRITICAL
    | ANOMALY_SEVERITY.MAJOR
    | ANOMALY_SEVERITY.MINOR
    | ANOMALY_SEVERITY.WARNING;
}

interface Props {
  alertParams: AlertParams;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function TransactionDurationAnomalyAlertTrigger(props: Props) {
  const { setAlertParams, alertParams, setAlertProperty } = props;
  const { urlParams } = useUrlParams();

  const serviceNameFromUrl = useServiceName();

  const transactionTypes = useServiceTransactionTypesFetcher(
    serviceNameFromUrl
  );
  const { agentName } = useServiceAgentNameFetcher(serviceNameFromUrl);

  const transactionTypeFromUrl = getTransactionType({
    transactionType: urlParams.transactionType,
    transactionTypes,
    agentName,
  });

  const { start, end, environment: environmentFromUrl } = urlParams;

  const params = defaults(
    {
      ...alertParams,
    },
    {
      windowSize: 15,
      windowUnit: 'm',
      transactionType: transactionTypeFromUrl,
      environment: environmentFromUrl || ENVIRONMENT_ALL.value,
      anomalySeverityType: ANOMALY_SEVERITY.CRITICAL,
      serviceName: serviceNameFromUrl,
    }
  );

  const { environmentOptions } = useEnvironmentsFetcher({
    serviceName: params.serviceName,
    start,
    end,
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
