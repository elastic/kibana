/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqueId } from 'lodash';
import { useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { getObservabilityAlerts } from '../services/get_observability_alerts';
import { FETCH_STATUS } from './use_fetcher';
import type { ObservabilityAppServices } from '../application/types';

export function useHasAlertData() {
  const { http } = useKibana<ObservabilityAppServices>().services;
  const [forceUpdate, setForceUpdate] = useState('');

  const [state, setState] = useState<{
    hasData: boolean | undefined;
    status: FETCH_STATUS;
  }>({
    hasData: undefined,
    status: FETCH_STATUS.NOT_INITIATED,
  });

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const alerts = await getObservabilityAlerts({ http });
        setState({
          hasData: alerts.length > 0,
          status: FETCH_STATUS.SUCCESS,
        });
      } catch (e) {
        setState({
          hasData: undefined,
          status: FETCH_STATUS.FAILURE,
        });
      }
    }

    if (!state.hasData || forceUpdate) {
      setState({
        hasData: state.hasData,
        status: FETCH_STATUS.LOADING,
      });
      fetchAlerts();
      setForceUpdate('');
    }
  }, [forceUpdate, http, state.hasData]);

  return {
    hasData: state.hasData === true,
    requestStatus: state.status,
    isRequestComplete: state?.status !== FETCH_STATUS.LOADING,
    refresh: () => {
      setForceUpdate(uniqueId());
      setState({
        hasData: state.hasData,
        status: FETCH_STATUS.LOADING,
      });
    },
  };
}
