/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { FlyoutTemplate } from '@kbn/flyout-template';
import type { AlertsBadgeDescriptor } from './alerts_badge';

const { Badge } = FlyoutTemplate.Header;

/**
 * Renders an alerts badge descriptor as a `FlyoutTemplate.Header.Badge`. Kept apart from
 * `alerts_badge.tsx` so the standalone badge's callers do not depend on `@kbn/flyout-template`.
 */
export function renderAlertsHeaderBadge(descriptor: AlertsBadgeDescriptor): ReactElement {
  return descriptor.href ? (
    <Badge
      key="alerts"
      id="alerts"
      color={descriptor.color}
      iconType={descriptor.iconType}
      data-test-subj={descriptor['data-test-subj']}
      toolTipContent={descriptor.toolTipContent}
      toolTipPosition="bottom"
      href={descriptor.href}
      aria-label={descriptor.ariaLabel}
      {...descriptor.ebtProps}
    >
      {descriptor.label}
    </Badge>
  ) : (
    <Badge
      key="alerts"
      id="alerts"
      color={descriptor.color}
      iconType={descriptor.iconType}
      data-test-subj={descriptor['data-test-subj']}
      toolTipContent={descriptor.toolTipContent}
      toolTipPosition="bottom"
      role="img"
      aria-label={descriptor.ariaLabel}
    >
      {descriptor.label}
    </Badge>
  );
}
