/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface SeverityBadgeProps {
  severityLevel?: string;
}

const colorMap: { [key: string]: string } = {
  critical: 'danger',
  warning: 'warning',
};

export function SeverityBadge({ severityLevel }: SeverityBadgeProps) {
  return (
    <EuiBadge color={severityLevel ? colorMap[severityLevel] : 'default'}>
      {severityLevel ??
        i18n.translate('xpack.observability.severityBadge.unknownDescription', {
          defaultMessage: 'unknown',
        })}
    </EuiBadge>
  );
}
