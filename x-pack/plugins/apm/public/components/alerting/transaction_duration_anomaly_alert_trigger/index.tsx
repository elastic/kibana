/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { defaults, omit } from 'lodash';
import React, { useEffect } from 'react';
import { CoreStart } from '../../../../../../../src/core/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { ANOMALY_SEVERITY } from '../../../../common/ml_constants';
import { createCallApmApi } from '../../../services/rest/create_call_apm_api';
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
  anomalySeverityType?:
    | ANOMALY_SEVERITY.CRITICAL
    | ANOMALY_SEVERITY.MAJOR
    | ANOMALY_SEVERITY.MINOR
    | ANOMALY_SEVERITY.WARNING;
  environment?: string;
  serviceName?: string;
  transactionType?: string;
  windowSize?: number;
  windowUnit?: string;
}

interface Props {
  ruleParams: AlertParams;
  metadata?: AlertMetadata;
  setRuleParams: (key: string, value: any) => void;
  setRuleProperty: (key: string, value: any) => void;
}

export function TransactionDurationAnomalyAlertTrigger(props: Props) {
  const { services } = useKibana();
  const { ruleParams, metadata, setRuleParams, setRuleProperty } = props;

  useEffect(() => {
    createCallApmApi(services as CoreStart);
  }, [services]);

  const params = defaults(
    {
      ...omit(metadata, ['start', 'end']),
      ...ruleParams,
    },
    {
      windowSize: 30,
      windowUnit: 'm',
      anomalySeverityType: ANOMALY_SEVERITY.CRITICAL,
      environment: ENVIRONMENT_ALL.value,
    }
  );

  const fields = [
    <ServiceField
      currentValue={params.serviceName}
      onChange={(value) => setRuleParams('serviceName', value)}
    />,
    <TransactionTypeField
      currentValue={params.transactionType}
      onChange={(value) => setRuleParams('transactionType', value)}
    />,
    <EnvironmentField
      currentValue={params.environment}
      onChange={(value) => setRuleParams('environment', value)}
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
          setRuleParams('anomalySeverityType', value);
        }}
      />
    </PopoverExpression>,
  ];

  return (
    <ServiceAlertTrigger
      fields={fields}
      defaults={params}
      setRuleParams={setRuleParams}
      setRuleProperty={setRuleProperty}
    />
  );
}

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default TransactionDurationAnomalyAlertTrigger;
