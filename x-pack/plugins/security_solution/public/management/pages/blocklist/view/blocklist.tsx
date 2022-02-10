/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useHttp } from '../../../../common/lib/kibana';
import { EventFiltersApiClient } from '../../event_filters/service/event_filters_api_client';
import { ArtifactListPage } from '../../../components/artifact_list_page';

export const Blocklist = memo(() => {
  const http = useHttp();
  // FIXME: Implement Blocklist API client and define list
  // for now, just using Event Filters
  const eventFiltersApiClient = EventFiltersApiClient.getInstance(http);

  return (
    <ArtifactListPage
      apiClient={eventFiltersApiClient}
      ArtifactFormComponent={() => <h1>{'TODO: Form here'}</h1>} // FIXME: IMplement create/edit form
      labels={{
        pageTitle: 'Blocklist', // FIXME: Implement labels prop overrides for blocklist
      }}
    />
  );
});

Blocklist.displayName = 'Blocklist';
