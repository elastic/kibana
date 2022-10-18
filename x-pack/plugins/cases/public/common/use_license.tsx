/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense, LicenseType } from '@kbn/licensing-plugin/public';
import { useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import { useKibana } from './lib/kibana';

interface UseLicenseReturnValue {
  isAtLeast: (level: LicenseType) => boolean;
  isAtLeastPlatinum: () => boolean;
  isAtLeastGold: () => boolean;
  isAtLeastEnterprise: () => boolean;
  getLicense: () => ILicense | null | undefined;
}

export const useLicense = (): UseLicenseReturnValue => {
  const { licensing } = useKibana().services;
  const license = useObservable<ILicense | null>(licensing?.license$ ?? new Observable(), null);

  const isAtLeast = useCallback(
    (level: LicenseType): boolean => {
      return !!license && license.isAvailable && license.isActive && license.hasAtLeast(level);
    },
    [license]
  );

  const isAtLeastPlatinum = useCallback(() => isAtLeast('platinum'), [isAtLeast]);
  const isAtLeastGold = useCallback(() => isAtLeast('gold'), [isAtLeast]);
  const isAtLeastEnterprise = useCallback(() => isAtLeast('enterprise'), [isAtLeast]);

  return {
    isAtLeast,
    isAtLeastPlatinum,
    isAtLeastGold,
    isAtLeastEnterprise,
    getLicense: () => license,
  };
};
