/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { find } from 'lodash';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { PageTemplate } from '../page_template';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { GlobalStateContext } from '../../contexts/global_state_context';
// @ts-ignore
import { CcrShard } from '../../../components/elasticsearch/ccr_shard';
import { ComponentProps } from '../../route_init';
import { SetupModeRenderer } from '../../../components/renderers/setup_mode';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { AlertsByName } from '../../../alerts/types';
import { fetchAlerts } from '../../../lib/fetch_alerts';
import { ELASTICSEARCH_SYSTEM_ID, RULE_CCR_READ_EXCEPTIONS } from '../../../../common/constants';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';

interface SetupModeProps {
  setupMode: any;
  flyoutComponent: any;
  bottomBarComponent: any;
}

export const ElasticsearchCcrShardPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { services } = useKibana<{ data: any }>();
  const [data, setData] = useState({} as any);
  const { index, shardId }: { index: string; shardId: string } = useParams();
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);

  const clusterUuid = globalState.cluster_uuid;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;

  useEffect(() => {
    if (cluster) {
      generateBreadcrumbs(cluster.cluster_name, {
        inElasticsearch: true,
        name: 'ccr',
        instance: `Index: ${index} Shard: ${shardId}`,
      });
    }
  }, [cluster, generateBreadcrumbs, index, shardId]);
  const ccs = globalState.ccs;
  const [alerts, setAlerts] = useState<AlertsByName>({});

  const title = i18n.translate('xpack.monitoring.elasticsearch.ccr.shard.title', {
    defaultMessage: 'Elasticsearch - Ccr - Shard',
  });

  const pageTitle = i18n.translate('xpack.monitoring.elasticsearch.ccr.shard.pageTitle', {
    defaultMessage: 'Elasticsearch Ccr Shard - Index: {followerIndex} Shard: {shardId}',
    values: {
      followerIndex: get(data, 'stat.follower.index', get(data, 'stat.follower_index')),
      shardId: get(data, 'stat.follower.shard.number', get(data, 'stat.shard_id')),
    },
  });

  const instance = i18n.translate('xpack.monitoring.elasticsearch.ccr.shard.instanceTitle', {
    defaultMessage: 'Index: {followerIndex} Shard: {shardId}',
    values: {
      followerIndex: get(data, 'stat.follower_index'),
      shardId: get(data, 'stat.shard_id'),
    },
  });

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/elasticsearch/ccr/${index}/shard/${shardId}`;

    if (services.http?.fetch && clusterUuid) {
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
      const alertsResponse = await fetchAlerts({
        fetch: services.http.fetch,
        alertTypeIds: [RULE_CCR_READ_EXCEPTIONS],
        clusterUuid,
        filters: [
          {
            shardId,
          },
        ],
        timeRange: {
          min: bounds.min.valueOf(),
          max: bounds.max.valueOf(),
        },
      });
      setAlerts(alertsResponse);
    }
  }, [ccs, clusterUuid, services.data?.query.timefilter.timefilter, services.http, index, shardId]);

  return (
    <PageTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      data-test-subj="elasticsearchCcrShardPage"
    >
      <SetupModeRenderer
        productName={ELASTICSEARCH_SYSTEM_ID}
        instance={instance}
        render={({ flyoutComponent, bottomBarComponent }: SetupModeProps) => (
          <SetupModeContext.Provider value={{ setupModeSupported: true }}>
            {flyoutComponent}
            <CcrShard {...data} alerts={alerts} />
            {bottomBarComponent}
          </SetupModeContext.Provider>
        )}
      />
    </PageTemplate>
  );
};
