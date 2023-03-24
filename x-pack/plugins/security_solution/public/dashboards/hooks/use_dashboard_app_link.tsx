/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDashboardEditUrl, DASHBOARD_APP_ID } from '@kbn/dashboard-plugin/public';
import type { QueryState } from '@kbn/data-plugin/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import { useEffect, useMemo, useState } from 'react';
import type { Filter, Query } from '@kbn/es-query';
import { useAppUrl } from '../../common/lib/kibana';
import { globalUrlParamSelectors } from '../../common/store/global_url_param';
import { useShallowEqualSelector } from '../../common/hooks/use_selector';

const GLOBAL_STATE_STORAGE_KEY = '_g';

export interface UseDashboardAppLinkProps {
  query?: Query;
  filters?: Filter[];
  timeRange: {
    from: string;
    to: string;
    fromStr?: string | undefined;
    toStr?: string | undefined;
  };
  uiSettings: IUiSettingsClient;
  savedObjectId: string | undefined;
  kbnUrlStateStorage: IKbnUrlStateStorage;
}

export const useDashboardAppLink = ({
  query,
  filters,
  timeRange: { from, fromStr, to, toStr },
  uiSettings,
  savedObjectId,
  kbnUrlStateStorage,
}: UseDashboardAppLinkProps) => {
  const { getAppUrl } = useAppUrl();
  const urlState = useShallowEqualSelector(globalUrlParamSelectors.selectGlobalUrlParam);
  const useHash = uiSettings.get('state:storeInSessionStorage');
  const [dashboardAppGlobalState, setDashboardAppGlobalState] = useState<QueryState>(
    kbnUrlStateStorage.get<QueryState>(GLOBAL_STATE_STORAGE_KEY) ?? ({} as QueryState)
  );
  let editDashboardUrl = useMemo(
    () =>
      getAppUrl({
        appId: DASHBOARD_APP_ID,
        path: `#${createDashboardEditUrl(savedObjectId)}`,
      }),
    [getAppUrl, savedObjectId]
  );

  useEffect(() => {
    /** Dashboard app puts all the url states under _g key
     *  Converting the url states form SecuritySolution to this format
     *  by set and get from kbnUrlStateStorage
     *  so we can maintain the states in Dashboard app
     * */
    const setUrl = async () => {
      await kbnUrlStateStorage.set<QueryState>(
        GLOBAL_STATE_STORAGE_KEY,
        {
          time: { from: fromStr ?? from, to: toStr ?? to },
          filters,
          query,
        },
        { replace: true }
      );
    };
    setUrl();
    setDashboardAppGlobalState(
      kbnUrlStateStorage.get<QueryState>(GLOBAL_STATE_STORAGE_KEY) ?? ({} as QueryState)
    );
  }, [filters, from, fromStr, kbnUrlStateStorage, query, to, toStr, urlState]);

  editDashboardUrl = setStateToKbnUrl<QueryState>(
    GLOBAL_STATE_STORAGE_KEY,
    dashboardAppGlobalState,
    { useHash },
    editDashboardUrl
  );

  return editDashboardUrl;
};
