/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { i18n } from '@kbn/i18n';

export type PLATFORM_TYPE = 'linux' | 'mac' | 'windows' | 'rpm' | 'deb';

export const PLATFORM_OPTIONS: Array<{
  label: string;
  id: PLATFORM_TYPE;
  'data-test-subj'?: string;
}> = [
  {
    id: 'linux',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.linux', {
      defaultMessage: 'Linux Tar',
    }),
    'data-test-subj': 'platformTypeLinux',
  },
  {
    id: 'mac',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.mac', {
      defaultMessage: 'Mac',
    }),
    'data-test-subj': 'platformTypeMac',
  },
  {
    id: 'windows',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.windows', {
      defaultMessage: 'Windows',
    }),
    'data-test-subj': 'platformTypeWindows',
  },
  {
    id: 'rpm',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.linux.rpm', {
      defaultMessage: 'RPM',
    }),
    'data-test-subj': 'platformTypeLinuxRpm',
  },
  {
    id: 'deb',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.linux.deb', {
      defaultMessage: 'DEB',
    }),
    'data-test-subj': 'platformTypeLinuxDeb',
  },
];

export function usePlatform() {
  const [platform, setPlatform] = useState<PLATFORM_TYPE>('linux');

  return {
    platform,
    setPlatform,
  };
}
