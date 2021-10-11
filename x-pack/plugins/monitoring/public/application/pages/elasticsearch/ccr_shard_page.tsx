/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { PageTemplate } from '../page_template';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { GlobalStateContext } from '../../global_state_context';
// @ts-ignore
import { CcrShardReact } from '../../../components/elasticsearch/ccr_shard';
import { ComponentProps } from '../../route_init';
import { SetupModeRenderer } from '../../setup_mode/setup_mode_renderer';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';

interface SetupModeProps {
  setupMode: any;
  flyoutComponent: any;
  bottomBarComponent: any;
}

export const ElasticsearchCcrShardPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { services } = useKibana<{ data: any }>();
  const { index, shardId }: { index: string; shardId: string } = useParams();

  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const [data, setData] = useState({} as any);

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
  }, [ccs, clusterUuid, services.data?.query.timefilter.timefilter, services.http, index, shardId]);

  return (
    <PageTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      data-test-subj="elasticsearchCcrShardPage"
    >
      <SetupModeRenderer
        instance={instance}
        render={({ flyoutComponent, bottomBarComponent }: SetupModeProps) => (
          <SetupModeContext.Provider value={{ setupModeSupported: true }}>
            {flyoutComponent}
            <CcrShardReact {...data} alerts={{}} />
            {bottomBarComponent}
          </SetupModeContext.Provider>
        )}
      />
    </PageTemplate>
  );
};
