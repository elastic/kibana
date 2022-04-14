/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { RedirectTo } from './redirect_to';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { enableServiceGroups } from '../../../../observability/public';
import { useFetcher, FETCH_STATUS } from '../../hooks/use_fetcher';

export function ServiceGroupsRedirect({
  children,
}: {
  children?: React.ReactNode;
}) {
  const { data = { serviceGroups: [] }, status } = useFetcher(
    (callApmApi) => callApmApi('GET /internal/apm/service-groups'),
    []
  );
  const { serviceGroups } = data;
  const isLoading =
    status === FETCH_STATUS.NOT_INITIATED || status === FETCH_STATUS.LOADING;
  const {
    services: { uiSettings },
  } = useKibana();
  const isServiceGroupsEnabled = uiSettings?.get<boolean>(enableServiceGroups);

  if (isLoading) {
    return null;
  }
  if (!isServiceGroupsEnabled || serviceGroups.length === 0) {
    return <RedirectTo pathname={'/services'} />;
  }
  return <>{children}</>;
}
