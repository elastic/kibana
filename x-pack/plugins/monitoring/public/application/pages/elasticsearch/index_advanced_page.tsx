/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useParams } from 'react-router-dom';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { ComponentProps } from '../../route_init';
import { SetupModeRenderer, SetupModeProps } from '../../setup_mode/setup_mode_renderer';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { useCharts } from '../../hooks/use_charts';
import { ItemTemplate } from './item_template';
// @ts-ignore
import { AdvancedIndex } from '../../../components/elasticsearch/index/advanced';
import { AlertsByName } from '../../../alerts/types';
import { fetchAlerts } from '../../../lib/fetch_alerts';
import { ELASTICSEARCH_SYSTEM_ID, RULE_LARGE_SHARD_SIZE } from '../../../../common/constants';

export const ElasticsearchIndexAdvancedPage: React.FC<ComponentProps> = () => {
  const globalState = useContext(GlobalStateContext);
  const { services } = useKibana<{ data: any }>();
  const { index }: { index: string } = useParams();
  const { zoomInfo, onBrush } = useCharts();
  const clusterUuid = globalState.cluster_uuid;
  const [data, setData] = useState({} as any);
  const [alerts, setAlerts] = useState<AlertsByName>({});

  const title = i18n.translate('xpack.monitoring.elasticsearch.index.advanced.title', {
    defaultMessage: 'Elasticsearch - Indices - {indexName} - Advanced',
    values: {
      indexName: index,
    },
  });

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/elasticsearch/indices/${index}`;
    if (services.http?.fetch && clusterUuid) {
      const response = await services.http?.fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          timeRange: {
            min: bounds.min.toISOString(),
            max: bounds.max.toISOString(),
          },
          is_advanced: true,
        }),
      });
      setData(response);
      const alertsResponse = await fetchAlerts({
        fetch: services.http.fetch,
        alertTypeIds: [RULE_LARGE_SHARD_SIZE],
        filters: [
          {
            shardIndex: index,
          },
        ],
        clusterUuid,
        timeRange: {
          min: bounds.min.valueOf(),
          max: bounds.max.valueOf(),
        },
      });
      setAlerts(alertsResponse);
    }
  }, [clusterUuid, services.data?.query.timefilter.timefilter, services.http, index]);

  return (
    <ItemTemplate title={title} getPageData={getPageData} id={index} pageType="indices">
      <SetupModeRenderer
        productName={ELASTICSEARCH_SYSTEM_ID}
        render={({ setupMode, flyoutComponent, bottomBarComponent }: SetupModeProps) => (
          <SetupModeContext.Provider value={{ setupModeSupported: true }}>
            {flyoutComponent}
            <AdvancedIndex
              setupMode={setupMode}
              alerts={alerts}
              indexSummary={data.indexSummary}
              metrics={data.metrics}
              onBrush={onBrush}
              zoomInfo={zoomInfo}
            />
            {bottomBarComponent}
          </SetupModeContext.Provider>
        )}
      />
    </ItemTemplate>
  );
};
