/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useObservable } from 'react-use';
import type { LicenseType } from '@kbn/licensing-plugin/public';
import { useKibana } from './use_kibana';
import type { RenderUpselling } from '../../services';

const MinimumLicenseRequired: LicenseType = 'enterprise';

export const useAvailability = (): {
  hasLicense: boolean;
  renderUpselling: RenderUpselling | undefined;
} => {
  const { licensing, renderUpselling$ } = useKibana().services;
  const licenseService = useObservable(licensing.license$);
  const renderUpselling = useObservable(renderUpselling$);
  const hasLicense = useMemo(
    () => licenseService?.hasAtLeast(MinimumLicenseRequired) ?? true,
    [licenseService]
  );
  return { hasLicense, renderUpselling };
};

export const useIsAvailable = (): boolean => {
  const { hasLicense, renderUpselling } = useAvailability();
  return hasLicense && !renderUpselling;
};
