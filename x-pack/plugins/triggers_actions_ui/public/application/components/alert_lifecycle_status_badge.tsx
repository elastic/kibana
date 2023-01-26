/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiBadgeProps } from '@elastic/eui';
import { AlertStatus, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';

export interface AlertLifecycleStatusBadgeProps {
  alertStatus: AlertStatus;
  flapping?: boolean | string;
}

const ACTIVE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.alertLifecycleStatusBadge.activeLabel',
  {
    defaultMessage: 'Active',
  }
);

const RECOVERED_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.alertLifecycleStatusBadge.recoveredLabel',
  {
    defaultMessage: 'Recovered',
  }
);

const FLAPPING_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.alertLifecycleStatusBadge.flappingLabel',
  {
    defaultMessage: 'Flapping',
  }
);

interface BadgeProps {
  label: string;
  color: string;
  iconProps?: {
    iconType: EuiBadgeProps['iconType'];
  };
}

const getBadgeProps = (alertStatus: AlertStatus, flapping: boolean | undefined): BadgeProps => {
  // Prefer recovered over flapping
  if (alertStatus === ALERT_STATUS_RECOVERED) {
    return {
      label: RECOVERED_LABEL,
      color: 'success',
    };
  }

  if (flapping) {
    return {
      label: FLAPPING_LABEL,
      color: 'danger',
      iconProps: {
        iconType: 'visGauge',
      },
    };
  }

  return {
    label: ACTIVE_LABEL,
    color: 'danger',
  };
};

const castFlapping = (flapping: boolean | string | undefined) => {
  if (typeof flapping === 'string') {
    return flapping === 'true';
  }
  return flapping;
};

export const AlertLifecycleStatusBadge = memo((props: AlertLifecycleStatusBadgeProps) => {
  const { alertStatus, flapping } = props;

  const castedFlapping = castFlapping(flapping);

  const { label, color, iconProps } = getBadgeProps(alertStatus, castedFlapping);

  return (
    <EuiBadge data-test-subj="alertLifecycleStatusBadge" color={color} {...iconProps}>
      {label}
    </EuiBadge>
  );
});

// eslint-disable-next-line import/no-default-export
export { AlertLifecycleStatusBadge as default };
