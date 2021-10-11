/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { GlobalStateContext } from '../../global_state_context';
import { ComponentProps } from '../../route_init';
// @ts-ignore
import { Listing } from '../../../components/logstash/listing';
import { LogstashTemplate } from './logstash_template';
import { SetupModeRenderer } from '../../setup_mode/setup_mode_renderer';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { useTable } from '../../hooks/use_table';

interface SetupModeProps {
  setupMode: any;
  flyoutComponent: any;
  bottomBarComponent: any;
}

export const LogStashNodesPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { services } = useKibana<{ data: any }>();
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  });
  const [data, setData] = useState({} as any);
  const { getPaginationTableProps } = useTable('logstash.nodes');

  const title = i18n.translate('xpack.monitoring.logstash.nodes.routeTitle', {
    defaultMessage: 'Logstash - Nodes',
  });

  const pageTitle = i18n.translate('xpack.monitoring.logstash.nodes.pageTitle', {
    defaultMessage: 'Logstash nodes',
  });

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/logstash/nodes`;
    const response = await services.http?.fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        ccs,
        timeRange: {
          min: bounds.min.toISOString(),
          max: bounds.max.toISOString(),
        },
      }),
    });

    setData(response);
  }, [ccs, clusterUuid, services.data?.query.timefilter.timefilter, services.http]);

  return (
    <LogstashTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      cluster={cluster}
    >
      <div>
        <SetupModeRenderer
          productName="logstash"
          render={({ setupMode, flyoutComponent, bottomBarComponent }: SetupModeProps) => (
            <SetupModeContext.Provider value={{ setupModeSupported: true }}>
              {flyoutComponent}
              <Listing
                stats={data.clusterStatus}
                metrics={data.metrics}
                data={data.nodes}
                setupMode={setupMode}
                {...getPaginationTableProps()}
              />
              {bottomBarComponent}
            </SetupModeContext.Provider>
          )}
        />
      </div>
    </LogstashTemplate>
  );
};
