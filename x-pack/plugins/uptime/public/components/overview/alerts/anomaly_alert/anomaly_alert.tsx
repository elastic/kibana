/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { DEFAULT_SEVERITY, SelectSeverity } from './select_severity';
import { monitorIdSelector } from '../../../../state/selectors';
import { getSeverityColor, getSeverityType } from '../../../../../../ml/public';

interface Props {
  setAlertParams: (key: string, value: any) => void;
}

// eslint-disable-next-line import/no-default-export
export default function AnomalyAlertComponent({ setAlertParams }: Props) {
  const [severity, setSeverity] = useState(DEFAULT_SEVERITY);

  const monitorId = useSelector(monitorIdSelector);

  useEffect(() => {
    setAlertParams('monitorId', monitorId);
  }, [monitorId, setAlertParams]);

  useEffect(() => {
    setAlertParams('severity', severity.val);
  }, [severity, setAlertParams]);

  return (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup direction={'column'} gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiExpression
            description={AnomalyTranslations.criteriaDescription}
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
            description={AnomalyTranslations.scoreDescription}
            id="severity"
            value={
              <EuiHealth
                style={{ textTransform: 'capitalize' }}
                color={getSeverityColor(severity.val)}
              >
                {getSeverityType(severity.val)}
              </EuiHealth>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
    </>
  );
}
