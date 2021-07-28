/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem, EuiText } from '@elastic/eui';
import React from 'react';
import { FILTER_OPEN } from '../../alerts_filter_group';
import * as i18n from '../../translations';

interface OpenAlertStatusProps {
  onClick: () => void;
  disabled?: boolean;
}

const OpenAlertStatusComponent: React.FC<OpenAlertStatusProps> = ({ onClick, disabled }) => {
  return (
    <EuiContextMenuItem
      key="open-alert"
      aria-label={i18n.ACTION_OPEN_ALERT}
      data-test-subj="open-alert-status"
      id={FILTER_OPEN}
      onClick={onClick}
      disabled={disabled}
    >
      <EuiText size="m">{i18n.ACTION_OPEN_ALERT}</EuiText>
    </EuiContextMenuItem>
  );
};

export const OpenAlertStatus = React.memo(OpenAlertStatusComponent);
