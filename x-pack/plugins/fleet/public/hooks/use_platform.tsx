/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { i18n } from '@kbn/i18n';

export type PLATFORM_TYPE = 'macos' | 'linux' | 'windows' | 'rpm' | 'deb';

export const PLATFORM_OPTIONS: Array<{
  label: string;
  id: PLATFORM_TYPE;
  'data-test-subj'?: string;
}> = [
  {
    id: 'macos',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.macos', {
      defaultMessage: 'MacOS',
    }),
    'data-test-subj': 'platformTypeMacos',
  },
  {
    id: 'linux',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.linux', {
      defaultMessage: 'Linux',
    }),
    'data-test-subj': 'platformTypeLinux',
  },
  {
    id: 'windows',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.windows', {
      defaultMessage: 'Windows',
    }),
    'data-test-subj': 'platformTypeWindows',
  },
  {
    id: 'deb',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.deb', {
      defaultMessage: 'Deb',
    }),
    'data-test-subj': 'platformTypeDeb',
  },
  {
    id: 'rpm',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.rpm', {
      defaultMessage: 'RPM',
    }),
    'data-test-subj': 'platformTypeRpm',
  },
];

export function usePlatform() {
  const [platform, setPlatform] = useState<PLATFORM_TYPE>('macos');

  return {
    platform,
    setPlatform,
  };
}
