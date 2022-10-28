/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { enableServiceGroups } from '@kbn/observability-plugin/public';
import { RedirectTo } from './redirect_to';

export function ServiceGroupsRedirect({
  children,
}: {
  children?: React.ReactNode;
}) {
  const {
    services: { uiSettings },
  } = useKibana();
  const isServiceGroupsEnabled = uiSettings?.get<boolean>(enableServiceGroups);

  if (!isServiceGroupsEnabled) {
    return <RedirectTo pathname={'/services'} />;
  }
  return <>{children}</>;
}
