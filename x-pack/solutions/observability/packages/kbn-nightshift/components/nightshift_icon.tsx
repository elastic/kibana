/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiIconProps } from '@elastic/eui';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import nightshiftIcon from '../assets/nightshift_icon.svg';
import nightshiftIconDark from '../assets/nightshift_icon_dark.svg';

export function NightshiftIcon(props: Omit<EuiIconProps, 'type'>) {
  const { colorMode } = useEuiTheme();
  const icon = colorMode === 'DARK' ? nightshiftIconDark : nightshiftIcon;

  return <EuiIcon type={icon} {...props} />;
}
