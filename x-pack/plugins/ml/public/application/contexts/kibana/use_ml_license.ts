/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { useMlKibana } from './kibana_context';

export const useMlLicenseInfo = () => {
  const {
    services: {
      mlServices: { mlLicense },
    },
  } = useMlKibana();

  return useObservable(mlLicense.licenseInfo$, mlLicense.getLicenseInfo());
};
