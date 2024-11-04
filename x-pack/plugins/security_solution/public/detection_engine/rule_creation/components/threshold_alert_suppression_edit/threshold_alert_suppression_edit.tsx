/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiToolTip } from '@elastic/eui';
import { CheckBoxField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { UseField, useFormData } from '../../../../shared_imports';
import { SuppressionDurationSelector } from './suppression_duration_selector';
import { THRESHOLD_ALERT_SUPPRESSION_ENABLED } from './fields';
import * as i18n from './translations';

interface ThresholdAlertSuppressionEditProps {
  suppressionFieldNames: string[] | undefined;
  disabled?: boolean;
  disabledText?: string;
}

export function ThresholdAlertSuppressionEdit({
  suppressionFieldNames,
  disabled,
  disabledText,
}: ThresholdAlertSuppressionEditProps): JSX.Element {
  const [{ [THRESHOLD_ALERT_SUPPRESSION_ENABLED]: suppressionEnabled }] = useFormData({
    watch: THRESHOLD_ALERT_SUPPRESSION_ENABLED,
  });
  const content = (
    <>
      <UseField
        path={THRESHOLD_ALERT_SUPPRESSION_ENABLED}
        component={CheckBoxField}
        componentProps={{
          idAria: 'thresholdAlertSuppressionEnabled',
          'data-test-subj': 'thresholdAlertSuppressionEnabled',
        }}
        euiFieldProps={{
          label: suppressionFieldNames?.length
            ? i18n.enableSuppressionForFields(suppressionFieldNames)
            : i18n.SUPPRESS_ALERTS,
          disabled,
        }}
      />
      <EuiPanel paddingSize="m" hasShadow={false}>
        <SuppressionDurationSelector disabled={!suppressionEnabled || disabled} />
      </EuiPanel>
    </>
  );

  return disabled && disabledText ? (
    <EuiToolTip position="right" content={disabledText}>
      {content}
    </EuiToolTip>
  ) : (
    content
  );
}
