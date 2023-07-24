/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILicense } from '@kbn/licensing-plugin/public';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { ProfilingAppPageTemplate } from '../../profiling_app_page_template';
import { LicensePrompt } from '../../license_prompt';
import { useProfilingDependencies } from '../profiling_dependencies/use_profiling_dependencies';

export const LicenseContext = React.createContext<ILicense | undefined>(undefined);

export function LicenseProvider({ children }: { children: React.ReactChild }) {
  const { license$ } = useProfilingDependencies().setup.licensing;
  const license = useObservable(license$);
  // if license is not loaded yet, consider it valid
  const hasInvalidLicense = license?.isActive === false;

  // if license is invalid show an error message
  if (hasInvalidLicense) {
    return (
      <ProfilingAppPageTemplate hideSearchBar tabs={[]}>
        <LicensePrompt />
      </ProfilingAppPageTemplate>
    );
  }

  // render rest of application and pass down license via context
  return <LicenseContext.Provider value={license} children={children} />;
}
