/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import { MlCapabilitiesResponse } from '@kbn/ml-plugin/public';
import { emptyMlCapabilities } from '../../../../../common/machine_learning/empty_ml_capabilities';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useHttp } from '../../../lib/kibana';
import { useGetMlCapabilities } from '../hooks/use_get_ml_capabilities';
import * as i18n from './translations';

export interface MlCapabilitiesProvider extends MlCapabilitiesResponse {
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
  const http = useHttp();
  const { addError } = useAppToasts();
  const { start, result, error } = useGetMlCapabilities();

  useEffect(() => {
    start({ http });
  }, [http, start]);

  useEffect(() => {
    if (result) {
      setCapabilities({ ...result, capabilitiesFetched: true });
    }
  }, [result]);

  useEffect(() => {
    if (error) {
      addError(error, {
        title: i18n.MACHINE_LEARNING_PERMISSIONS_FAILURE,
      });
    }
  }, [addError, error]);

  return (
    <MlCapabilitiesContext.Provider value={capabilities}>{children}</MlCapabilitiesContext.Provider>
  );
});

MlCapabilitiesProvider.displayName = 'MlCapabilitiesProvider';
