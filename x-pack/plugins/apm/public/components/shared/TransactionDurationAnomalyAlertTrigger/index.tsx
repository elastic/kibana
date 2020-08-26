/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiText, EuiSelect, EuiExpression } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
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
import {
  ENVIRONMENT_ALL,
  getEnvironmentLabel,
} from '../../../../common/environment_filter_values';

interface Params {
  windowSize: number;
  windowUnit: string;
  serviceName: string;
  transactionType: string;
  environment: string;
  anomalyScore: 0 | 25 | 50 | 75;
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
  const { serviceName, start, end } = urlParams;
  const { environmentOptions } = useEnvironments({ serviceName, start, end });

  if (!transactionTypes.length || !serviceName) {
    return null;
  }

  const defaults: Params = {
    windowSize: 15,
    windowUnit: 'm',
    transactionType: transactionTypes[0],
    serviceName,
    environment: urlParams.environment || ENVIRONMENT_ALL.value,
    anomalyScore: 75,
  };

  const params = {
    ...defaults,
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
      value={
        <EuiText className="eui-displayInlineBlock">
          <h5>{serviceName}</h5>
        </EuiText>
      }
    />,
    <PopoverExpression
      value={getEnvironmentLabel(params.environment)}
      title={i18n.translate(
        'xpack.apm.transactionDurationAnomalyAlertTrigger.environment',
        {
          defaultMessage: 'Environment',
        }
      )}
    >
      <EuiSelect
        value={params.environment}
        options={environmentOptions}
        onChange={(e) => setAlertParams('environment', e.target.value)}
        compressed
      />
    </PopoverExpression>,
    <PopoverExpression
      value={params.transactionType}
      title={i18n.translate(
        'xpack.apm.transactionDurationAnomalyAlertTrigger.type',
        {
          defaultMessage: 'Type',
        }
      )}
    >
      <EuiSelect
        value={params.transactionType}
        options={transactionTypes.map((key) => {
          return {
            text: key,
            value: key,
          };
        })}
        onChange={(e) => setAlertParams('transactionType', e.target.value)}
        compressed
      />
    </PopoverExpression>,
    <PopoverExpression
      value={<AnomalySeverity severityScore={params.anomalyScore} />}
      title={i18n.translate(
        'xpack.apm.transactionDurationAnomalyAlertTrigger.anomalySeverity',
        {
          defaultMessage: 'Has anomaly with severity',
        }
      )}
    >
      <SelectAnomalySeverity
        value={params.anomalyScore}
        onChange={(value) => {
          setAlertParams('anomalyScore', value);
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
