/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { CODE_PATH_ALL } from '../../../../common/constants';
import { PageTemplate } from '../page_template';
import { useClusters } from '../../hooks/use_clusters';
import { GlobalStateContext } from '../../global_state_context';
import { TabMenuItem } from '../page_template';
import { PageLoading } from '../../../components';
import { Overview } from '../../../components/cluster/overview';
import { ExternalConfigContext } from '../../external_config_context';
import { SetupModeRenderer } from '../../setup_mode/setup_mode_renderer';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';

const CODE_PATHS = [CODE_PATH_ALL];
interface SetupModeProps {
  setupMode: any;
  flyoutComponent: any;
  bottomBarComponent: any;
}

export const ClusterOverview: React.FC<{}> = () => {
  // TODO: check how many requests with useClusters
  const state = useContext(GlobalStateContext);
  const externalConfig = useContext(ExternalConfigContext);
  const { clusters, loaded } = useClusters(state.cluster_uuid, state.ccs, CODE_PATHS);
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

  return (
    <PageTemplate title={title} pageTitle={pageTitle} tabs={tabs}>
      {loaded ? (
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
      ) : (
        <PageLoading />
      )}
    </PageTemplate>
  );
};
