/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { SUPPORTED_PLATFORMS } from './constants';

import linuxSvg from './logos/linux.svg';
import windowsSvg from './logos/windows.svg';
import macosSvg from './logos/macos.svg';
import { PlatformType } from './types';

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

export const getSupportedPlatforms = (payload: string) => {
  let platformArray: string[];
  try {
    platformArray = payload?.split(',').map((platformString) => platformString.trim());
  } catch (e) {
    return undefined;
  }

  if (!platformArray) return;

  return uniq(
    platformArray.reduce((acc, nextPlatform) => {
      if (!SUPPORTED_PLATFORMS.includes(nextPlatform as PlatformType)) {
        if (nextPlatform === 'posix') {
          acc.push(PlatformType.darwin);
          acc.push(PlatformType.linux);
        }
        if (nextPlatform === 'ubuntu') {
          acc.push(PlatformType.linux);
        }
      } else {
        acc.push(nextPlatform);
      }
      return acc;
    }, [] as string[])
  ).join(',');
};
