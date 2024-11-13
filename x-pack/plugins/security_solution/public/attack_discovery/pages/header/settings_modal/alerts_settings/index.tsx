/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SingleRangeChangeEvent } from '@kbn/elastic-assistant';
import { EuiFlexGroup, EuiFlexItem, EuiForm, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import {
  AlertsRange,
  SELECT_FEWER_ALERTS,
  YOUR_ANONYMIZATION_SETTINGS,
} from '@kbn/elastic-assistant';
import React, { useCallback } from 'react';

import * as i18n from '../translations';

export const MAX_ALERTS = 500;
export const MIN_ALERTS = 50;
export const ROW_MIN_WITH = 550; // px
export const STEP = 50;

interface Props {
  maxAlerts: string;
  setMaxAlerts: React.Dispatch<React.SetStateAction<string>>;
}

const AlertsSettingsComponent: React.FC<Props> = ({ maxAlerts, setMaxAlerts }) => {
  const onChangeAlertsRange = useCallback(
    (e: SingleRangeChangeEvent) => {
      setMaxAlerts(e.currentTarget.value);
    },
    [setMaxAlerts]
  );

  return (
    <EuiForm component="form">
      <EuiFormRow hasChildLabel={false} label={i18n.ALERTS}>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem grow={false}>
            <AlertsRange
              maxAlerts={MAX_ALERTS}
              minAlerts={MIN_ALERTS}
              onChange={onChangeAlertsRange}
              step={STEP}
              value={maxAlerts}
            />
            <EuiSpacer size="m" />
          </EuiFlexItem>

          <EuiFlexItem grow={true}>
            <EuiText color="subdued" size="xs">
              <span data-test-subj="latestAndRiskiest">
                {i18n.LATEST_AND_RISKIEST_OPEN_ALERTS(Number(maxAlerts))}
              </span>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={true}>
            <EuiText color="subdued" size="xs">
              <span>{YOUR_ANONYMIZATION_SETTINGS}</span>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={true}>
            <EuiText color="subdued" size="xs">
              <span>{SELECT_FEWER_ALERTS}</span>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiForm>
  );
};

AlertsSettingsComponent.displayName = 'AlertsSettings';

export const AlertsSettings = React.memo(AlertsSettingsComponent);
