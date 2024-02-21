/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import React, { useMemo } from 'react';
import linuxSvg from '../logos/linux.svg';
import windowsSvg from '../logos/windows.svg';
import macosSvg from '../logos/macos.svg';

export interface PlatformIconProps {
  platform: string;
}

const PlatformIconComponent: React.FC<PlatformIconProps> = ({ platform }) => {
  const platformIconModule = useMemo(() => getPlatformIconModule(platform), [platform]);

  return <EuiIcon type={platformIconModule} title={platform} size="l" />;
};

export const PlatformIcon = React.memo(PlatformIconComponent);

const getPlatformIconModule = (platform: string) => {
  switch (platform) {
    case 'darwin':
      return macosSvg;
    case 'linux':
      return linuxSvg;
    case 'windows':
      return windowsSvg;
    default:
      return `${platform}`;
  }
};
