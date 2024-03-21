/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';

interface IncludeCitationsFieldProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export const IncludeCitationsField: React.FC<IncludeCitationsFieldProps> = ({
  checked,
  onChange,
}) => (
  <EuiFormRow>
    <EuiSwitch
      label={i18n.translate('xpack.searchPlayground.sidebar.citationsField.label', {
        defaultMessage: 'Include citations',
      })}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  </EuiFormRow>
);
