/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import { useRouteMatch } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
// @ts-expect-error
import { isPipelineMonitoringSupportedInVersion } from '../../../lib/logstash/pipelines';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { ComponentProps } from '../../route_init';
// @ts-expect-error
import { Listing } from '../../../components/logstash/listing';
import { LogstashTemplate } from './logstash_template';
// @ts-expect-error
import { DetailStatus } from '../../../components/logstash/detail_status';
// @ts-expect-error
import { MonitoringTimeseriesContainer } from '../../../components/chart';
import { useTable } from '../../hooks/use_table';
// @ts-expect-error
import { PipelineListing } from '../../../components/logstash/pipeline_listing/pipeline_listing';
import { useCharts } from '../../hooks/use_charts';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';

export const LogStashNodePipelinesPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const match = useRouteMatch<{ uuid: string | undefined }>();
  const { services } = useKibana<{ data: any }>();
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;
  const { onBrush, zoomInfo } = useCharts();
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;

  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);

  const { getPaginationTableProps, getPaginationRouteOptions, updateTotalItemCount } =
    useTable('logstash.pipelines');

  const [data, setData] = useState({} as any);

  const title = i18n.translate('xpack.monitoring.logstash.node.pipelines.routeTitle', {
    defaultMessage: 'Logstash - {nodeName} - Pipelines',
    values: {
      nodeName: data.nodeSummary ? data.nodeSummary.name : '',
    },
  });

  const pageTitle = i18n.translate('xpack.monitoring.logstash.node.pipelines.pageTitle', {
    defaultMessage: 'Logstash node pipelines: {nodeName}',
    values: {
      nodeName: data.nodeSummary ? data.nodeSummary.name : '',
    },
  });

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/logstash/node/${match.params.uuid}/pipelines`;
    const response = await services.http?.fetch<any>(url, {
      method: 'POST',
      body: JSON.stringify({
        ccs,
        timeRange: {
          min: bounds.min.toISOString(),
          max: bounds.max.toISOString(),
        },
        ...getPaginationRouteOptions(),
      }),
    });

    setData(response);
    updateTotalItemCount(response.totalPipelineCount);
  }, [
    ccs,
    clusterUuid,
    services.data?.query.timefilter.timefilter,
    services.http,
    getPaginationRouteOptions,
    updateTotalItemCount,
    match.params.uuid,
  ]);

  useEffect(() => {
    if (cluster && data.nodeSummary) {
      generateBreadcrumbs(cluster.cluster_name, {
        inLogstash: true,
        instance: data.nodeSummary.host,
        name: 'nodes',
      });
    }
  }, [cluster, data, generateBreadcrumbs]);

  return (
    <LogstashTemplate
      instance={data}
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      cluster={cluster}
    >
      {data.pipelines && (
        <div data-test-subj="logstashPipelinesListing">
          <PipelineListing
            className="monitoringLogstashPipelinesTable"
            onBrush={onBrush}
            zoomInfo={zoomInfo}
            stats={data.nodeSummary}
            data={data.pipelines}
            statusComponent={DetailStatus}
            {...getPaginationTableProps()}
            upgradeMessage={makeUpgradeMessage(data.nodeSummary.version)}
          />
        </div>
      )}
    </LogstashTemplate>
  );
};

function makeUpgradeMessage(logstashVersions: any) {
  if (
    !Array.isArray(logstashVersions) ||
    logstashVersions.length === 0 ||
    logstashVersions.some(isPipelineMonitoringSupportedInVersion)
  ) {
    return null;
  }

  return 'Pipeline monitoring is only available in Logstash version 6.0.0 or higher.';
}
