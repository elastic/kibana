/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import { ComponentProps } from '../../route_init';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { useCharts } from '../../hooks/use_charts';
// @ts-ignore
import { Beat } from '../../../components/beats/beat';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';
import { BeatsTemplate } from './beats_template';

export const BeatsInstancePage: React.FC<ComponentProps> = ({ clusters }) => {
  const { instance }: { instance: string } = useParams();

  const globalState = useContext(GlobalStateContext);
  const { services } = useKibana<{ data: any }>();
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);
  const { zoomInfo, onBrush } = useCharts();
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;
  const [data, setData] = useState({} as any);
  const [beatName, setBeatName] = useState('');

  const title = i18n.translate('xpack.monitoring.beats.instance.routeTitle', {
    defaultMessage: 'Beats - {instanceName} - Overview',
    values: {
      instanceName: beatName,
    },
  });

  const pageTitle = i18n.translate('xpack.monitoring.beats.instance.pageTitle', {
    defaultMessage: 'Beat instance: {beatName}',
    values: {
      beatName,
    },
  });

  useEffect(() => {
    if (cluster) {
      generateBreadcrumbs(cluster.cluster_name, {
        inBeats: true,
        instance: beatName,
      });
    }
  }, [cluster, beatName, generateBreadcrumbs]);

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/beats/beat/${instance}`;
    const response = await services.http?.fetch<{ summary: { name: string } }>(url, {
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
    setBeatName(response?.summary.name || '');
  }, [ccs, clusterUuid, instance, services.data?.query.timefilter.timefilter, services.http]);

  return (
    <BeatsTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      instance={instance}
      data-test-subj="beatDetailPage"
    >
      <div data-test-subj="monitoringBeatsInstanceApp">
        <Beat summary={data.summary} metrics={data.metrics} onBrush={onBrush} zoomInfo={zoomInfo} />
      </div>
    </BeatsTemplate>
  );
};
