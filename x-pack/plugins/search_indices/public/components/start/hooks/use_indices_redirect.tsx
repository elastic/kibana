/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import type { IndicesStatusResponse } from '../../../../common';

import { useKibana } from '../../../hooks/use_kibana';

import { navigateToIndexDetails } from './utils';

export const useIndicesRedirect = (indicesStatus?: IndicesStatusResponse) => {
  const { application, http } = useKibana().services;
  return useEffect(() => {
    if (!indicesStatus) return;
    if (indicesStatus.indexNames.length === 0) return;
    if (indicesStatus.indexNames.length === 1) {
      navigateToIndexDetails(application, http, indicesStatus.indexNames[0]);
      return;
    }
    application.navigateToApp('management', { deepLinkId: 'index_management' });
  }, [application, http, indicesStatus]);
};
