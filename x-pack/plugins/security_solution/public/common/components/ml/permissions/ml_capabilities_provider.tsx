/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';

import { MlCapabilitiesResponse } from '../../../../../../ml/public';
import { emptyMlCapabilities } from '../../../../../common/machine_learning/empty_ml_capabilities';
import { getMlCapabilities } from '../api/get_ml_capabilities';
import { errorToToaster, useStateToaster } from '../../toasters';

import * as i18n from './translations';

interface MlCapabilitiesProvider extends MlCapabilitiesResponse {
  capabilitiesFetched: boolean;
}

const emptyMlCapabilitiesProvider = {
  ...emptyMlCapabilities,
  capabilitiesFetched: false,
};

export const MlCapabilitiesContext = React.createContext<MlCapabilitiesProvider>(
  emptyMlCapabilitiesProvider
);

MlCapabilitiesContext.displayName = 'MlCapabilitiesContext';

export const MlCapabilitiesProvider = React.memo<{ children: JSX.Element }>(({ children }) => {
  const [capabilities, setCapabilities] = useState<MlCapabilitiesProvider>(
    emptyMlCapabilitiesProvider
  );
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchMlCapabilities() {
      try {
        const mlCapabilities = await getMlCapabilities(abortCtrl.signal);
        if (isSubscribed) {
          setCapabilities({ ...mlCapabilities, capabilitiesFetched: true });
        }
      } catch (error) {
        if (isSubscribed) {
          errorToToaster({
            title: i18n.MACHINE_LEARNING_PERMISSIONS_FAILURE,
            error,
            dispatchToaster,
          });
        }
      }
    }

    fetchMlCapabilities();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MlCapabilitiesContext.Provider value={capabilities}>{children}</MlCapabilitiesContext.Provider>
  );
});

MlCapabilitiesProvider.displayName = 'MlCapabilitiesProvider';
