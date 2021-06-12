/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import linuxSvg from './logos/linux.svg';
import windowsSvg from './logos/windows.svg';
import macosSvg from './logos/macos.svg';

export const getPlatformIconModule = (platform: string) => {
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
