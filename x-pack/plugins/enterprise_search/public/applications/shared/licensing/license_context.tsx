/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { KibanaContext, IKibanaContext } from '../../';

import { ILicense } from '../../../../licensing/public';

export interface ILicenseContext {
  license?: ILicense;
}

export const LicenseContext = React.createContext();

export const LicenseProvider: React.FC<> = ({ children }) => {
  // Listen for changes to license subscription
  const { license$ } = useContext(KibanaContext) as IKibanaContext;
  const license = useObservable(license$);

  // Render rest of application and pass down license via context
  return <LicenseContext.Provider value={{ license }} children={children} />;
};
