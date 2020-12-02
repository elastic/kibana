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
import { useEnvironmentsFetcher } from '../../../hooks/use_environments_fetcher';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { ServiceAlertTrigger } from '../ServiceAlertTrigger';
import { PopoverExpression } from '../ServiceAlertTrigger/PopoverExpression';
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
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';

interface Params {
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
  alertParams: Params;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
}

export function TransactionDurationAnomalyAlertTrigger(props: Props) {
  const { setAlertParams, alertParams, setAlertProperty } = props;
  const { urlParams } = useUrlParams();
  const { transactionTypes } = useApmServiceContext();
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { start, end, transactionType } = urlParams;
  const { environmentOptions } = useEnvironmentsFetcher({
    serviceName,
    start,
    end,
  });

  if (serviceName && !transactionTypes.length) {
    return null;
  }

  const defaults: Params = {
    windowSize: 15,
    windowUnit: 'm',
    transactionType: transactionType || transactionTypes[0],
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
