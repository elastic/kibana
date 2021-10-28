/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { CODE_PATH_ALL } from '../../../../common/constants';
import { PageTemplate } from '../page_template';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { TabMenuItem } from '../page_template';
import { Overview } from '../../../components/cluster/overview';
import { ExternalConfigContext } from '../../contexts/external_config_context';
import { SetupModeRenderer, SetupModeProps } from '../../../components/renderers/setup_mode';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';
import { fetchClusters } from '../../../lib/fetch_clusters';
import { AlertsByName } from '../../../alerts/types';
import { fetchAlerts } from '../../../lib/fetch_alerts';
import { EnableAlertsModal } from '../../../alerts/enable_alerts_modal';

const CODE_PATHS = [CODE_PATH_ALL];

export const ClusterOverview: React.FC<{}> = () => {
  const state = useContext(GlobalStateContext);
  const externalConfig = useContext(ExternalConfigContext);
  const { services } = useKibana<{ data: any }>();
  const clusterUuid = state.cluster_uuid;
  const ccs = state.ccs;
  const [clusters, setClusters] = useState([] as any);
  const [alerts, setAlerts] = useState<AlertsByName>({});
  const [loaded, setLoaded] = useState<boolean | null>(false);
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);

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
        testSubj: 'overviewTabsclusterName',
        route: '/overview',
      },
    ];
  }

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    if (services.http?.fetch && clusterUuid) {
      const response = await fetchClusters({
        fetch: services.http.fetch,
        timeRange: {
          min: bounds.min.toISOString(),
          max: bounds.max.toISOString(),
        },
        ccs,
        clusterUuid,
        codePaths: CODE_PATHS,
      });
      setClusters(response);
      const alertsResponse = await fetchAlerts({
        fetch: services.http.fetch,
        clusterUuid,
        timeRange: {
          min: bounds.min.valueOf(),
          max: bounds.max.valueOf(),
        },
      });
      setAlerts(alertsResponse);
      setLoaded(true);
    }
  }, [ccs, clusterUuid, services.data?.query.timefilter.timefilter, services.http]);

  useEffect(() => {
    if (clusters && clusters.length) {
      generateBreadcrumbs(clusters[0].cluster_name);
    }
  }, [clusters, generateBreadcrumbs]);

  return (
    <PageTemplate title={title} pageTitle={pageTitle} tabs={tabs} getPageData={getPageData}>
      <SetupModeRenderer
        render={({ setupMode, flyoutComponent, bottomBarComponent }: SetupModeProps) => (
          <SetupModeContext.Provider value={{ setupModeSupported: true }}>
            {flyoutComponent}
            <Overview
              cluster={clusters[0]}
              alerts={alerts}
              setupMode={setupMode}
              showLicenseExpiration={externalConfig.showLicenseExpiration}
            />
            {/* <EnableAlertsModal alerts={this.alerts} /> */}
            {bottomBarComponent}
          </SetupModeContext.Provider>
        )}
      />
      <EnableAlertsModal alerts={alerts} />
    </PageTemplate>
  );
};
