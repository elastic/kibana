/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React from 'react';
import { FILTER_ACKNOWLEDGED } from '../../alerts_filter_group';
import * as i18n from '../../translations';

interface AcknowledgedAlertStatusProps {
  onClick: () => void;
  disabled?: boolean;
}

const AcknowledgedAlertStatusComponent: React.FC<AcknowledgedAlertStatusProps> = ({
  onClick,
  disabled,
}) => {
  return (
    <EuiContextMenuItem
      key="acknowledged-alert"
      aria-label={i18n.ACTION_ACKNOWLEDGED_ALERT}
      data-test-subj="acknowledged-alert-status"
      id={FILTER_ACKNOWLEDGED}
      onClick={onClick}
      disabled={disabled}
    >
      {i18n.ACTION_ACKNOWLEDGED_ALERT}
    </EuiContextMenuItem>
  );
};

export const AcknowledgedAlertStatus = React.memo(AcknowledgedAlertStatusComponent);
