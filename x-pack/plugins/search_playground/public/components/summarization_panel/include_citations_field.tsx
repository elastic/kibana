/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { AnalyticsEvents } from '../../analytics/constants';

interface IncludeCitationsFieldProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export const IncludeCitationsField: React.FC<IncludeCitationsFieldProps> = ({
  checked,
  onChange,
}) => {
  const usageTracker = useUsageTracker();
  const handleChange = (value: boolean) => {
    onChange(value);
    usageTracker?.click(`${AnalyticsEvents.includeCitations}_${String(value)}`);
  };

  return (
    <EuiFormRow fullWidth>
      <EuiSwitch
        label={i18n.translate('xpack.searchPlayground.sidebar.citationsField.label', {
          defaultMessage: 'Include citations',
        })}
        checked={checked}
        onChange={(e) => handleChange(e.target.checked)}
      />
    </EuiFormRow>
  );
};
