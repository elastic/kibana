/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';

import { getDashboard } from './api';
import * as i18n from './translations';

interface Props {
  connectorId: string;
  selectedProvider: string;
}

export interface UseGetDashboard {
  dashboardUrl: string | null;
  isLoading: boolean;
}
export const useGetDashboard = ({ connectorId, selectedProvider }: Props): UseGetDashboard => {
  const {
    dashboard,
    http,
    notifications: { toasts },
    spaces,
  } = useKibana().services;

  const [spaceId, setSpaceId] = useState<string | null>(null);

  useEffect(() => {
    let didCancel = false;
    if (spaces) {
      spaces.getActiveSpace().then((space) => {
        if (!didCancel) setSpaceId(space.id);
      });
    }

    return () => {
      didCancel = true;
    };
  }, [spaces]);

  const [isLoading, setIsLoading] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const [dashboardCheckComplete, setDashboardCheckComplete] = useState<boolean>(false);
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
      setDashboardUrl(url ?? null);
    },
    [connectorId, dashboard?.locator]
  );

  useEffect(() => {
    let didCancel = false;
    const fetchData = async (dashboardId: string) => {
      abortCtrl.current = new AbortController();
      if (!didCancel) setIsLoading(true);
      try {
        const res = await getDashboard({
          http,
          signal: abortCtrl.current.signal,
          connectorId,
          dashboardId,
        });

        if (!didCancel) {
          setDashboardCheckComplete(true);
          setIsLoading(false);
          if (res.data?.available) {
            setUrl(dashboardId);
          }

          if (res.status && res.status === 'error') {
            toasts.addDanger({
              title: i18n.GET_DASHBOARD_API_ERROR(selectedProvider),
              text: `${res.serviceMessage ?? res.message}`,
            });
          }
        }
      } catch (error) {
        if (!didCancel) {
          setDashboardCheckComplete(true);
          setIsLoading(false);
          toasts.addDanger({
            title: i18n.GET_DASHBOARD_API_ERROR(selectedProvider),
            text: error.message,
          });
        }
      }
    };

    if (spaceId != null && connectorId.length > 0 && !dashboardCheckComplete) {
      abortCtrl.current.abort();
      fetchData(getDashboardId(selectedProvider, spaceId));
    }

    return () => {
      didCancel = true;
      setIsLoading(false);
      abortCtrl.current.abort();
    };
  }, [
    connectorId,
    dashboardCheckComplete,
    dashboardUrl,
    http,
    selectedProvider,
    setUrl,
    spaceId,
    toasts,
  ]);

  return {
    isLoading,
    dashboardUrl,
  };
};

const getDashboardId = (selectedProvider: string, spaceId: string): string =>
  {
      let ai = "openai"
      if (selectedProvider.toLowerCase().includes('bedrock')) {
          ai = 'bedrock'
      } else if (selectedProvider.toLowerCase().includes('gemini')) {
          ai = 'gemini'
      }
      return `generative-ai-token-usage-${ai}-${spaceId}`;
  }
  
  // `generative-ai-token-usage-${
  //   selectedProvider.toLowerCase().includes('openai') ? 'openai' : 'bedrock'
  // }-${spaceId}`;
