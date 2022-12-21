/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { ILicense } from '@kbn/licensing-plugin/public';
import { useApmPluginContext } from '../apm_plugin/use_apm_plugin_context';
import { InvalidLicenseNotification } from './invalid_license_notification';

export const LicenseContext = React.createContext<ILicense | undefined>(
  undefined
);

export function LicenseProvider({ children }: { children: React.ReactChild }) {
  const { license$ } = useApmPluginContext().plugins.licensing;
  const license = useObservable(license$);
  // if license is not loaded yet, consider it valid
  const hasInvalidLicense = license?.isActive === false;

  // if license is invalid show an error message
  if (hasInvalidLicense) {
    return <InvalidLicenseNotification />;
  }

  // render rest of application and pass down license via context
  return <LicenseContext.Provider value={license} children={children} />;
}
