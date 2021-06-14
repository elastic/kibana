/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';

export type PLATFORM_TYPE = 'linux-mac' | 'windows' | 'rpm-deb';
export const PLATFORM_OPTIONS: Array<{ text: string; value: PLATFORM_TYPE }> = [
  { text: 'Linux / macOS', value: 'linux-mac' },
  { text: 'Windows', value: 'windows' },
  { text: 'RPM / DEB', value: 'rpm-deb' },
];

export function usePlatform() {
  const [platform, setPlatform] = useState<PLATFORM_TYPE>('linux-mac');

  return {
    platform,
    setPlatform,
  };
}
