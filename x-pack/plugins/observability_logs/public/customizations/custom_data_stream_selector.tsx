/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { DataStreamSelector } from '../components/data_stream_selector';
import { useDataView } from '../utils/internal_state_container_context';

interface Props {
  stateContainer: DiscoverStateContainer;
}

export function CustomDataStreamSelector({ stateContainer }: Props) {
  const dataView = useDataView();

  return (
    <DataStreamSelector
      title={dataView.getName()}
      integrations={[]}
      uncategorizedStreams={[]}
      onUncategorizedClick={() => console.log('fetch uncategorized streams')}
    />
  );
}
