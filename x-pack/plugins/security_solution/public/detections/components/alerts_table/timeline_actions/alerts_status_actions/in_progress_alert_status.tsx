/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React from 'react';
import { FILTER_IN_PROGRESS } from '../../alerts_filter_group';
import * as i18n from '../../translations';

interface InProgressAlertStatusProps {
  onClick: () => void;
  disabled?: boolean;
}

const InProgressAlertStatusComponent: React.FC<InProgressAlertStatusProps> = ({
  onClick,
  disabled,
}) => {
  return (
    <EuiContextMenuItem
      key="in-progress-alert"
      aria-label={i18n.ACTION_IN_PROGRESS_ALERT}
      data-test-subj="in-progress-alert-status"
      id={FILTER_IN_PROGRESS}
      onClick={onClick}
      disabled={disabled}
    >
      {i18n.ACTION_IN_PROGRESS_ALERT}
    </EuiContextMenuItem>
  );
};

export const InProgressAlertStatus = React.memo(InProgressAlertStatusComponent);
