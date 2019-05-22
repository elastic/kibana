/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FETCH_STATUS, useFetcher } from '../../hooks/useFetcher';
import { loadLicense } from '../../services/rest/xpack';
import { InvalidLicenseNotification } from './InvalidLicenseNotification';

const initialLicense = {
  features: {
    watcher: { is_available: false },
    ml: { is_available: false }
  },
  license: { is_active: false }
};
export const LicenseContext = React.createContext(initialLicense);

export const LicenseProvider: React.FC = ({ children }) => {
  const { data = initialLicense, status } = useFetcher(() => loadLicense(), []);
  const hasValidLicense = data.license.is_active;

  // if license is invalid show an error message
  if (status === FETCH_STATUS.SUCCESS && !hasValidLicense) {
    return <InvalidLicenseNotification />;
  }

  // render rest of application and pass down license via context
  return <LicenseContext.Provider value={data} children={children} />;
};
