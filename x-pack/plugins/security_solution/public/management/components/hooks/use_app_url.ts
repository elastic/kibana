/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useKibana } from '../../../common/lib/kibana';
import { APP_ID } from '../../../../common/constants';

/**
 * Returns a full URL to the provided page path by using
 * kibana's `getUrlForApp()`
 */
export const useAppUrl = () => {
  const { getUrlForApp } = useKibana().services.application;

  const getAppUrl = useCallback(
    ({ appId = APP_ID, ...options }: { appId?: string; deepLinkId?: string; path?: string }) =>
      getUrlForApp(appId, options),
    [getUrlForApp]
  );
  return { getAppUrl };
};
