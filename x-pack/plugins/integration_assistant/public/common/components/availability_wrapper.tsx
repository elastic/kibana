/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, type PropsWithChildren } from 'react';
import { useObservable } from 'react-use';
import type { LicenseType } from '@kbn/licensing-plugin/public';
import { useKibana } from '../hooks/use_kibana';

const MinimumLicenseRequired: LicenseType = 'enterprise';

type AvailabilityWrapperProps = PropsWithChildren<{}>;
export const AvailabilityWrapper = React.memo<AvailabilityWrapperProps>(({ children }) => {
  const { licensing, UpsellingPage } = useKibana().services;
  const licenseService = useObservable(licensing.license$);
  const hasLicense = useMemo(
    () => licenseService?.hasAtLeast(MinimumLicenseRequired) ?? false,
    [licenseService]
  );
  if (UpsellingPage) {
    return <UpsellingPage />;
  }
  if (!hasLicense) {
    return <LicenseRequiredPage />;
  }
  return <>{children}</>;
});
AvailabilityWrapper.displayName = 'AvailabilityWrapper';

const LicenseRequiredPage = React.memo(() => {
  return <div>{'No license page'}</div>;
});
LicenseRequiredPage.displayName = 'LicenseRequiredPage';
