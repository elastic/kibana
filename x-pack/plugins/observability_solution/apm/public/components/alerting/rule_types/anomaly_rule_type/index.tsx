/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { defaults, omit } from 'lodash';
import React, { useEffect } from 'react';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { EuiText } from '@elastic/eui';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { createCallApmApi } from '../../../../services/rest/create_call_apm_api';
import { EnvironmentField, ServiceField, TransactionTypeField } from '../../utils/fields';
import { AlertMetadata } from '../../utils/helper';
import { ApmRuleParamsContainer } from '../../ui_components/apm_rule_params_container';
import { PopoverExpression } from '../../ui_components/popover_expression';
import { AnomalySeverity, SelectAnomalySeverity } from './select_anomaly_severity';
import { SelectAnomalyDetector } from './select_anomaly_detector';
import {
  ANOMALY_DETECTOR_SELECTOR_OPTIONS,
  getApmMlDetectorLabel,
} from '../../../../../common/rules/apm_rule_types';
import { AnomalyDetectorType } from '../../../../../common/anomaly_detection/apm_ml_detectors';

export interface AlertParams {
  anomalySeverityType?:
    | ML_ANOMALY_SEVERITY.CRITICAL
    | ML_ANOMALY_SEVERITY.MAJOR
    | ML_ANOMALY_SEVERITY.MINOR
    | ML_ANOMALY_SEVERITY.WARNING;
  anomalyDetectorTypes?: AnomalyDetectorType[];
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
  errors: { anomalyDetectorTypes?: string };
}

export function AnomalyRuleType(props: Props) {
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
      windowUnit: TIME_UNITS.MINUTE,
      anomalySeverityType: ML_ANOMALY_SEVERITY.CRITICAL,
      anomalyDetectorTypes: ANOMALY_DETECTOR_SELECTOR_OPTIONS.map((detector) => detector.type),
      environment: ENVIRONMENT_ALL.value,
    }
  );

  const anomalyDetectorsSelectedLabels = params.anomalyDetectorTypes.map((type) =>
    getApmMlDetectorLabel(type)
  );

  const fields = [
    <ServiceField
      currentValue={params.serviceName}
      onChange={(value) => {
        if (value !== params.serviceName) {
          setRuleParams('serviceName', value);
          setRuleParams('transactionType', '');
          setRuleParams('environment', ENVIRONMENT_ALL.value);
        }
      }}
    />,
    <TransactionTypeField
      currentValue={params.transactionType}
      onChange={(value) => setRuleParams('transactionType', value)}
      serviceName={params.serviceName}
    />,
    <EnvironmentField
      currentValue={params.environment}
      onChange={(value) => setRuleParams('environment', value)}
      serviceName={params.serviceName}
    />,
    <PopoverExpression
      value={anomalyDetectorsSelectedLabels.join(', ')}
      title={i18n.translate('xpack.apm.anomalyRuleType.anomalyDetector', {
        defaultMessage: 'Detector types',
      })}
      color={props.errors.anomalyDetectorTypes ? 'danger' : 'success'}
    >
      {props.errors.anomalyDetectorTypes && (
        <EuiText size="xs" color="danger">
          <FormattedMessage
            id="xpack.apm.anomalyRuleType.anomalyDetector.infoLabel"
            defaultMessage="At least one detector should be selected"
          />
        </EuiText>
      )}

      <SelectAnomalyDetector
        values={params.anomalyDetectorTypes}
        onChange={(values) => {
          setRuleParams('anomalyDetectorTypes', values);
        }}
      />
    </PopoverExpression>,
    <PopoverExpression
      value={<AnomalySeverity type={params.anomalySeverityType} />}
      title={i18n.translate('xpack.apm.transactionDurationAnomalyRuleType.anomalySeverity', {
        defaultMessage: 'Has anomaly with severity',
      })}
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
    <ApmRuleParamsContainer
      fields={fields}
      defaultParams={params}
      setRuleParams={setRuleParams}
      setRuleProperty={setRuleProperty}
    />
  );
}

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default AnomalyRuleType;
