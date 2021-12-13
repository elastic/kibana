/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiExpression,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiHealth,
  EuiText,
} from '@elastic/eui';
import { useSelector } from 'react-redux';
import React, { useEffect, useState } from 'react';
import { AnomalyTranslations } from './translations';
import { AlertExpressionPopover } from '../alert_expression_popover';
import { DEFAULT_SEVERITY, SelectSeverity, SEVERITY_OPTIONS } from './select_severity';
import { monitorIdSelector } from '../../../../state/selectors';
import { getSeverityColor, getSeverity } from '../../../../../../ml/public';

interface Props {
  ruleParams: { [key: string]: any };
  setRuleParams: (key: string, value: any) => void;
}

export function AnomalyAlertComponent({ setRuleParams, ruleParams }: Props) {
  const [severity, setSeverity] = useState(DEFAULT_SEVERITY);

  const monitorIdStore = useSelector(monitorIdSelector);

  const monitorId = monitorIdStore || ruleParams?.monitorId;

  useEffect(() => {
    setRuleParams('monitorId', monitorId);
  }, [monitorId, setRuleParams]);

  useEffect(() => {
    setRuleParams('severity', severity.val);
  }, [severity, setRuleParams]);

  useEffect(() => {
    if (ruleParams.severity !== undefined) {
      setSeverity(SEVERITY_OPTIONS.find(({ val }) => val === ruleParams.severity)!);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup direction={'column'} gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiExpression
            description={AnomalyTranslations.whenMonitor}
            value={
              <EuiText className="eui-displayInlineBlock">
                <h5>{monitorId}</h5>
              </EuiText>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AlertExpressionPopover
            aria-label={AnomalyTranslations.scoreAriaLabel}
            content={
              <SelectSeverity
                data-test-subj="uptimeAnomalySeverityValue"
                value={severity}
                onChange={setSeverity}
              />
            }
            data-test-subj={'uptimeAnomalySeverity'}
            description={AnomalyTranslations.hasAnomalyWithSeverity}
            id="severity"
            value={
              <EuiHealth
                style={{ textTransform: 'capitalize' }}
                color={getSeverityColor(severity.val)}
              >
                {getSeverity(severity.val).label}
              </EuiHealth>
            }
            isEnabled={true}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
    </>
  );
}
