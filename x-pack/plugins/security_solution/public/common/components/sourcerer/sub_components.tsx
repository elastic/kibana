/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEventHandler } from 'react';
import { EuiButton, EuiCallOut, EuiCheckbox, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ResetButton, StyledFormRow } from './helpers';
import * as i18n from './translations';

interface SourcererCalloutProps {
  isOnlyDetectionAlerts: boolean;
  title: string;
}

export const SourcererCallout = React.memo<SourcererCalloutProps>(
  ({ isOnlyDetectionAlerts, title }) =>
    isOnlyDetectionAlerts ? (
      <EuiCallOut data-test-subj="sourcerer-callout" iconType="iInCircle" size="s" title={title} />
    ) : null
);

SourcererCallout.displayName = 'SourcererCallout';

interface AlertsCheckboxProps {
  checked: boolean;
  isShow: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

export const AlertsCheckbox = React.memo<AlertsCheckboxProps>(({ onChange, checked, isShow }) =>
  isShow ? (
    <StyledFormRow>
      <EuiCheckbox
        checked={checked}
        data-test-subj="sourcerer-alert-only-checkbox"
        id="sourcerer-alert-only-checkbox"
        label={i18n.ALERTS_CHECKBOX_LABEL}
        onChange={onChange}
      />
    </StyledFormRow>
  ) : null
);

AlertsCheckbox.displayName = 'AlertsCheckbox';

interface SaveButtonsProps {
  disableSave: boolean;
  isShow: boolean;
  onReset: () => void;
  onSave: () => void;
}

export const SaveButtons = React.memo<SaveButtonsProps>(
  ({ disableSave, isShow, onReset, onSave }) =>
    isShow ? (
      <StyledFormRow>
        <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <ResetButton
              aria-label={i18n.INDEX_PATTERNS_RESET}
              data-test-subj="sourcerer-reset"
              flush="left"
              onClick={onReset}
              title={i18n.INDEX_PATTERNS_RESET}
            >
              {i18n.INDEX_PATTERNS_RESET}
            </ResetButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onSave}
              disabled={disableSave}
              data-test-subj="sourcerer-save"
              fill
              fullWidth
              size="s"
            >
              {i18n.SAVE_INDEX_PATTERNS}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </StyledFormRow>
    ) : null
);

SaveButtons.displayName = 'SaveButtons';
