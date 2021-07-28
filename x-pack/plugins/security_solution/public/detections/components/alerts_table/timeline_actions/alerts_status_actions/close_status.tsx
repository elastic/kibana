/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem, EuiText } from '@elastic/eui';
import React from 'react';
import { FILTER_CLOSED } from '../../alerts_filter_group';
import * as i18n from '../../translations';

interface CloseAlertActionProps {
  onClick: () => void;
  disabled?: boolean;
}

const CloseAlertActionComponent: React.FC<CloseAlertActionProps> = ({ onClick, disabled }) => {
  return (
    <EuiContextMenuItem
      key="close-alert"
      aria-label={i18n.ACTION_CLOSE_ALERT}
      data-test-subj="close-alert-status"
      id={FILTER_CLOSED}
      onClick={onClick}
      disabled={disabled}
    >
      <EuiText size="m">{i18n.ACTION_CLOSE_ALERT}</EuiText>
    </EuiContextMenuItem>
  );
};

export const CloseAlertAction = React.memo(CloseAlertActionComponent);
