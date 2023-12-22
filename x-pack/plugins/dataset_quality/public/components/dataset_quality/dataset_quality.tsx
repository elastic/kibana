/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DataStreamsStatsService } from '../../services/data_streams_stats/data_streams_stats_service';
import { DatasetQualityContext, DatasetQualityContextValue } from './context';
import { useKibanaContextForPluginProvider } from '../../utils';
import { DatasetQualityStartDeps } from '../../types';
import { Header } from './header';
import { Table } from './table';

export interface CreateDatasetQualityArgs {
  core: CoreStart;
  plugins: DatasetQualityStartDeps;
}

export const createDatasetQuality = ({ core, plugins }: CreateDatasetQualityArgs) => {
  return () => {
    const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(core, plugins);

    const dataStreamsStatsServiceClient = new DataStreamsStatsService().start({
      http: core.http,
    }).client;

    const datasetQualityProviderValue: DatasetQualityContextValue = {
      dataStreamsStatsServiceClient,
    };

    return (
      <DatasetQualityContext.Provider value={datasetQualityProviderValue}>
        <KibanaContextProviderForPlugin>
          <DatasetQuality />
        </KibanaContextProviderForPlugin>
      </DatasetQualityContext.Provider>
    );
  };
};

function DatasetQuality() {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <Header />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Table />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
