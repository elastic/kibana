/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { getDashboardId } from './constants';
import { getDashboard } from './api/dashboard';
import * as i18n from './translations';

interface Props {
  connectorId: string;
}

export interface UseGetDashboard {
  dashboardUrl: string | null;
  isLoading: boolean;
}

export const useGetDashboard = ({ connectorId }: Props): UseGetDashboard => {
  const {
    dashboard,
    http,
    notifications: { toasts },
    spaces,
  } = useKibana().services;

  const [spaceId, setSpaceId] = useState<string>();
  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);

  const [isLoading, setIsLoading] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const abortCtrl = useRef(new AbortController());

  const setUrl = useCallback(
    (dashboardId: string) => {
      const url = dashboard?.locator?.getRedirectUrl({
        query: {
          language: 'kuery',
          query: `kibana.saved_objects: { id  : ${connectorId} }`,
        },
        dashboardId,
      });
      console.log('set url!');
      setDashboardUrl(url ?? null);
    },
    [connectorId, dashboard?.locator]
  );

  useEffect(() => {
    let didCancel = false;
    const fetchData = async (dashboardId: string) => {
      abortCtrl.current = new AbortController();
      setIsLoading(true);
      try {
        const res = await getDashboard({
          http,
          signal: abortCtrl.current.signal,
          connectorId,
          dashboardId,
        });

        if (!didCancel) {
          setIsLoading(false);
          if (res.data?.exists) {
            setUrl(dashboardId);
          }

          if (res.status && res.status === 'error') {
            toasts.addDanger({
              title: i18n.GET_DASHBOARD_API_ERROR,
              text: `${res.serviceMessage ?? res.message}`,
            });
          }
        }
      } catch (error) {
        if (!didCancel) {
          setIsLoading(false);
          toasts.addDanger({
            title: i18n.GET_DASHBOARD_API_ERROR,
            text: error.message,
          });
        }
      }
    };

    if (dashboardUrl == null && spaceId != null && spaceId.length) {
      abortCtrl.current.abort();
      fetchData(getDashboardId(spaceId));
    }

    return () => {
      didCancel = true;
      setIsLoading(false);
      abortCtrl.current.abort();
    };
  }, [http, toasts, spaceId, dashboard.locator, setUrl, dashboardUrl, connectorId]);

  return {
    isLoading,
    dashboardUrl,
  };
};
