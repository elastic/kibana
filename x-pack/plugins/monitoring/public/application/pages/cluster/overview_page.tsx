/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { CODE_PATH_ALL } from '../../../../common/constants';
import { PageTemplate } from '../page_template';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { GlobalStateContext } from '../../global_state_context';
import { TabMenuItem } from '../page_template';
import { Overview } from '../../../components/cluster/overview';
import { ExternalConfigContext } from '../../external_config_context';
import { SetupModeRenderer } from '../../setup_mode/setup_mode_renderer';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../../common/constants';

const CODE_PATHS = [CODE_PATH_ALL];
interface SetupModeProps {
  setupMode: any;
  flyoutComponent: any;
  bottomBarComponent: any;
}

export const ClusterOverview: React.FC<{}> = () => {
  const state = useContext(GlobalStateContext);
  const externalConfig = useContext(ExternalConfigContext);
  const { services } = useKibana<{ data: any }>();
  const clusterUuid = state.cluster_uuid;
  const ccs = state.ccs;
  const [clusters, setClusters] = useState([] as any);
  const [loaded, setLoaded] = useState<boolean | null>(false);

  let tabs: TabMenuItem[] = [];

  const title = i18n.translate('xpack.monitoring.cluster.overviewTitle', {
    defaultMessage: 'Overview',
  });

  const pageTitle = i18n.translate('xpack.monitoring.cluster.overview.pageTitle', {
    defaultMessage: 'Cluster overview',
  });

  if (loaded) {
    tabs = [
      {
        id: 'clusterName',
        label: clusters[0].cluster_name,
        disabled: false,
        description: clusters[0].cluster_name,
        onClick: () => {},
        testSubj: 'clusterName',
      },
    ];
  }

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    let url = '../api/monitoring/v1/clusters';
    if (clusterUuid) {
      url += `/${clusterUuid}`;
    }

    try {
      const response = await services.http?.fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          ccs,
          timeRange: {
            min: bounds.min.toISOString(),
            max: bounds.max.toISOString(),
          },
          codePaths: CODE_PATHS,
        }),
      });

      setClusters(formatClusters(response));
    } catch (err) {
      // TODO: handle errors
    } finally {
      setLoaded(true);
    }
  }, [ccs, clusterUuid, services.data?.query.timefilter.timefilter, services.http]);

  return (
    <PageTemplate title={title} pageTitle={pageTitle} tabs={tabs} getPageData={getPageData}>
      <SetupModeRenderer
        render={({ setupMode, flyoutComponent, bottomBarComponent }: SetupModeProps) => (
          <SetupModeContext.Provider value={{ setupModeSupported: true }}>
            {flyoutComponent}
            <Overview
              cluster={clusters[0]}
              alerts={[]}
              setupMode={setupMode}
              showLicenseExpiration={externalConfig.showLicenseExpiration}
            />
            {/* <EnableAlertsModal alerts={this.alerts} /> */}
            {bottomBarComponent}
          </SetupModeContext.Provider>
        )}
      />
    </PageTemplate>
  );
};

function formatClusters(clusters: any) {
  return clusters.map(formatCluster);
}

function formatCluster(cluster: any) {
  if (cluster.cluster_uuid === STANDALONE_CLUSTER_CLUSTER_UUID) {
    cluster.cluster_name = 'Standalone Cluster';
  }
  return cluster;
}
