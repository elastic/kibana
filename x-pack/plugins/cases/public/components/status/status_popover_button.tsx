/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge } from '@elastic/eui';

import type { CaseStatuses } from '@kbn/cases-components';
import { statuses } from './config';
import * as i18n from './translations';

interface Props {
  disabled?: boolean;
  status: CaseStatuses;
  onClick: () => void;
}

const StatusPopoverButtonComponent: React.FC<Props> = ({ status, disabled = false, onClick }) => {
  return (
    <EuiBadge
      iconType="arrowDown"
      iconSide="right"
      iconOnClick={onClick}
      iconOnClickAriaLabel={i18n.STATUS_ICON_ARIA}
      data-test-subj={`case-status-badge-popover-button-${status}`}
      isDisabled={disabled}
      color={statuses[status].color}
    >
      {statuses[status].label}
    </EuiBadge>
  );
};

StatusPopoverButtonComponent.displayName = 'StatusPopoverButton';

export const StatusPopoverButton = memo(StatusPopoverButtonComponent);
