/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';

import { ILicense } from '../../../../../licensing/public';

export interface ILicenseContext {
  license: ILicense;
}
interface ILicenseContextProps {
  license$: Observable<ILicense>;
  children: React.ReactNode;
}

export const LicenseContext = React.createContext({});

export const LicenseProvider: React.FC<ILicenseContextProps> = ({ license$, children }) => {
  // Listen for changes to license subscription
  const license = useObservable(license$);

  // Render rest of application and pass down license via context
  return <LicenseContext.Provider value={{ license }} children={children} />;
};
