/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDashboardEditUrl, DASHBOARD_APP_ID } from '@kbn/dashboard-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import { useMemo } from 'react';
import type { Filter, Query } from '@kbn/es-query';
import { useNavigation } from '../../common/lib/kibana';

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
}

export const useDashboardAppLink = ({
  query,
  filters,
  timeRange: { from, fromStr, to, toStr },
  uiSettings,
  savedObjectId,
}: UseDashboardAppLinkProps) => {
  const { navigateTo, getAppUrl } = useNavigation();
  const useHash = uiSettings.get('state:storeInSessionStorage');

  let editDashboardUrl = useMemo(
    () =>
      getAppUrl({
        appId: DASHBOARD_APP_ID,
        path: `#${createDashboardEditUrl(savedObjectId)}`,
      }),
    [getAppUrl, savedObjectId]
  );

  editDashboardUrl = setStateToKbnUrl(
    GLOBAL_STATE_STORAGE_KEY,
    {
      time: { from: fromStr ?? from, to: toStr ?? to },
      filters,
      query,
    },
    { useHash, storeInHashQuery: true },
    editDashboardUrl
  );

  const editDashboardLinkProps = useMemo(
    () => ({
      onClick: (ev: React.MouseEvent<HTMLButtonElement>) => {
        ev.preventDefault();
        navigateTo({ url: editDashboardUrl });
      },
      href: editDashboardUrl,
    }),
    [editDashboardUrl, navigateTo]
  );
  return editDashboardLinkProps;
};
