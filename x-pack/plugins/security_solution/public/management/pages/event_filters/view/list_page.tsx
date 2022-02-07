/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { ArtifactListPage } from '../../../components/artifact_list_page/artifact_list_page';
import { EventFiltersApiClient } from '../service/event_filters_api_client';
import { useHttp } from '../../../../common/lib/kibana';

export interface EventFiltersListPageProps {
  foo?: string;
}

export const EventFiltersListPageAlpha = memo<EventFiltersListPageProps>((props) => {
  const http = useHttp();
  const eventFiltersApiClient = EventFiltersApiClient.getInstance(http);

  return (
    <ArtifactListPage
      apiClient={eventFiltersApiClient}
      ArtifactFormComponent={() => <>{'Form here'}</>}
    />
  );
});
EventFiltersListPageAlpha.displayName = 'EventFiltersListPageAlpha';
