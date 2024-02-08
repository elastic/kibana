/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { CoreStart } from '@kbn/core/public';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { dynamic } from '@kbn/shared-ux-utility';
import { DatasetQualityContext, DatasetQualityContextValue } from './context';
import { useKibanaContextForPluginProvider } from '../../utils';
import { DatasetQualityStartDeps } from '../../types';
import { DatasetQualityController } from '../../controller';
import { SummaryPanelProvider } from '../../hooks';
import { DataStreamsStatsService } from '../../services/data_streams_stats';

export interface DatasetQualityProps {
  controller: DatasetQualityController;
}

export interface CreateDatasetQualityArgs {
  core: CoreStart;
  plugins: DatasetQualityStartDeps;
}

export const createDatasetQuality = ({ core, plugins }: CreateDatasetQualityArgs) => {
  return ({ controller }: DatasetQualityProps) => {
    const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(core, plugins);

    const dataStreamStatsClient = new DataStreamsStatsService().start({
      http: core.http,
    }).client;

    const datasetQualityProviderValue: DatasetQualityContextValue = useMemo(
      () => ({
        service: controller.service,
      }),
      [controller.service]
    );

    return (
      <SummaryPanelProvider
        dataStreamStatsClient={dataStreamStatsClient}
        toasts={core.notifications.toasts}
      >
        <DatasetQualityContext.Provider value={datasetQualityProviderValue}>
          <KibanaContextProviderForPlugin>
            <DatasetQuality />
          </KibanaContextProviderForPlugin>
        </DatasetQualityContext.Provider>
      </SummaryPanelProvider>
    );
  };
};

const Header = dynamic(() => import('./header'));
const Table = dynamic(() => import('./table'));
const SummaryPanel = dynamic(() => import('./summary_panel/summary_panel'));

function DatasetQuality() {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <Header />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SummaryPanel />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Table />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
