/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFormRow, EuiText, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiRange } from '@elastic/eui';
import type { EuiRangeProps } from '@elastic/eui';
import { MAX_RISK_SCORE, MIN_RISK_SCORE } from '../../validators/default_risk_score_validator';
import * as i18n from './translations';

interface DefaultRiskScoreProps {
  value: number;
  onChange: (newValue: number) => void;
  errorMessage?: string;
  idAria?: string;
  dataTestSubj?: string;
}

export function DefaultRiskScore({
  value,
  onChange,
  errorMessage,
  idAria,
  dataTestSubj = 'defaultRiskScore',
}: DefaultRiskScoreProps) {
  const handleChange = useCallback<NonNullable<EuiRangeProps['onChange']>>(
    (event) => {
      const eventValue = (event.target as HTMLInputElement).value;
      const intOrNanValue = Number.parseInt(eventValue.trim(), 10);
      const intValue = Number.isNaN(intOrNanValue) ? MIN_RISK_SCORE : intOrNanValue;

      onChange(intValue);
    },
    [onChange]
  );

  return (
    <EuiFlexItem>
      <EuiFormRow
        label={<DefaultRiskScoreLabel />}
        error={errorMessage}
        isInvalid={!!errorMessage}
        fullWidth
        data-test-subj={`${dataTestSubj}-defaultRisk`}
        describedByIds={idAria ? [idAria] : undefined}
      >
        <EuiRange
          value={value}
          onChange={handleChange}
          max={MAX_RISK_SCORE}
          min={MIN_RISK_SCORE}
          showRange
          showInput
          fullWidth={false}
          showTicks
          tickInterval={25}
          data-test-subj={`${dataTestSubj}-defaultRiskRange`}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
}

function DefaultRiskScoreLabel() {
  return (
    <div>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>{i18n.DEFAULT_RISK_SCORE}</EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size={'xs'}>{i18n.RISK_SCORE_DESCRIPTION}</EuiText>
    </div>
  );
}
