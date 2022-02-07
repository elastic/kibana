/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { ArtifactListPage } from '../../../components/artifact_list_page/artifact_list_page';

export interface EventFiltersListPageProps {
  foo?: string;
}

export const EventFiltersListPageAlpha = memo<EventFiltersListPageProps>((props) => {
  return <ArtifactListPage apiClient={{}} ArtifactFormComponent={() => <>{'Form here'}</>} />;
});
EventFiltersListPageAlpha.displayName = 'EventFiltersListPageAlpha';
