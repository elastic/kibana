/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';

export const STATUS_ICON_TYPES = {
  RED: 'RED' as const,
  YELLOW: 'YELLOW' as const,
  GREEN: 'GREEN' as const,
  GRAY: 'GRAY' as const,
};

const typeToIconMap = {
  [STATUS_ICON_TYPES.RED]: 'danger',
  [STATUS_ICON_TYPES.YELLOW]: 'warning',
  [STATUS_ICON_TYPES.GREEN]: 'success',
  [STATUS_ICON_TYPES.GRAY]: 'subdued',
};

export interface StatusIconProps {
  type: keyof typeof STATUS_ICON_TYPES;
  label: string;
}
export const StatusIcon: React.FunctionComponent<StatusIconProps> = ({ type, label }) => {
  const icon = typeToIconMap[type];

  return (
    <EuiIcon
      // @ts-ignore
      alt={label}
      size="l"
      data-test-subj="statusIcon"
      type="dot"
      color={icon}
    />
  );
};
