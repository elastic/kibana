/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, type EuiIconProps } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import linuxSvg from './logos/linux.svg';
import windowsSvg from './logos/windows.svg';
import macosSvg from './logos/macos.svg';

export type Platform = 'macos' | 'linux' | 'windows';
const getPlatformIcon = (platform: Platform) => {
  switch (platform) {
    case 'macos':
      return macosSvg;
    case 'linux':
      return linuxSvg;
    case 'windows':
      return windowsSvg;
    default:
      return `${platform}`;
  }
};

export const PlatformIcon = memo<{
  platform: Platform;
  size?: EuiIconProps['size'];
}>(({ platform, size = 'xl' }) => {
  const platformIcon = useMemo(() => getPlatformIcon(platform), [platform]);

  return <EuiIcon type={platformIcon} title={platform} size={size} />;
});

PlatformIcon.displayName = 'PlatformIcon';
