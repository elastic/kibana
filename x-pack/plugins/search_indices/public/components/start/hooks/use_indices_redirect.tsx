/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import type { IndicesStatusResponse } from '../../../../common';

import { useKibana } from '../../../hooks/use_kibana';

import { navigateToIndexDetails } from '../../utils';
import { useUsageTracker } from '../../../contexts/usage_tracker_context';
import { AnalyticsEvents } from '../../../analytics/constants';

export const useIndicesRedirect = (indicesStatus?: IndicesStatusResponse) => {
  const { application, http } = useKibana().services;
  const [lastStatus, setLastStatus] = useState<IndicesStatusResponse | undefined>(() => undefined);
  const [hasDoneRedirect, setHasDoneRedirect] = useState(() => false);
  const usageTracker = useUsageTracker();
  return useEffect(() => {
    if (hasDoneRedirect) {
      return;
    }
    if (!indicesStatus) {
      return;
    }
    if (indicesStatus.indexNames.length === 0) {
      setLastStatus(indicesStatus);
      return;
    }
    if (lastStatus === undefined && indicesStatus.indexNames.length > 0) {
      application.navigateToApp('management', { deepLinkId: 'index_management' });
      setHasDoneRedirect(true);
      return;
    }
    if (indicesStatus.indexNames.length === 1) {
      navigateToIndexDetails(application, http, indicesStatus.indexNames[0]);
      setHasDoneRedirect(true);
      usageTracker.click(AnalyticsEvents.startCreateIndexCreatedRedirect);
      return;
    }
    application.navigateToApp('management', { deepLinkId: 'index_management' });
    setHasDoneRedirect(true);
  }, [
    application,
    http,
    indicesStatus,
    lastStatus,
    setHasDoneRedirect,
    usageTracker,
    hasDoneRedirect,
  ]);
};
