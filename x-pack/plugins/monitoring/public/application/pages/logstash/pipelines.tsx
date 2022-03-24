/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import { useKibana, useUiSetting } from '../../../../../../../src/plugins/kibana_react/public';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { ComponentProps } from '../../route_init';
import { useCharts } from '../../hooks/use_charts';
// @ts-ignore
import { isPipelineMonitoringSupportedInVersion } from '../../../lib/logstash/pipelines';
// @ts-ignore
import { PipelineListing } from '../../../components/logstash/pipeline_listing/pipeline_listing';
import { LogstashTemplate } from './logstash_template';
import { useTable } from '../../hooks/use_table';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';

export const LogStashPipelinesPage: React.FC<ComponentProps> = ({ clusters }) => {
  const globalState = useContext(GlobalStateContext);
  const { onBrush } = useCharts();
  const { services } = useKibana<{ data: any }>();
  const dateFormat = useUiSetting<string>('dateFormat');

  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;

  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;
  const [data, setData] = useState(null);
  const { getPaginationTableProps, getPaginationRouteOptions, updateTotalItemCount } =
    useTable('logstash.pipelines');

  const title = i18n.translate('xpack.monitoring.logstash.pipelines.routeTitle', {
    defaultMessage: 'Logstash Pipelines',
  });

  const pageTitle = i18n.translate('xpack.monitoring.logstash.pipelines.pageTitle', {
    defaultMessage: 'Logstash pipelines',
  });

  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const url = `../api/monitoring/v1/clusters/${clusterUuid}/logstash/pipelines`;

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
  ]);

  useEffect(() => {
    if (cluster) {
      generateBreadcrumbs(cluster.cluster_name, {
        inLogstash: true,
      });
    }
  }, [cluster, data, generateBreadcrumbs]);

  const renderOverview = (pageData: any) => {
    if (pageData === null) {
      return null;
    }
    const { clusterStatus, pipelines } = pageData || {};

    const upgradeMessage = pageData ? makeUpgradeMessage(clusterStatus.versions) : null;
    return (
      <PipelineListing
        className="monitoringLogstashPipelinesTable"
        onBrush={(xaxis: any) => onBrush({ xaxis })}
        stats={clusterStatus}
        data={pipelines}
        {...getPaginationTableProps()}
        upgradeMessage={upgradeMessage}
        dateFormat={dateFormat}
      />
    );
  };

  return (
    <LogstashTemplate
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      cluster={cluster}
    >
      <div data-test-subj="logstashPipelinesListing">{renderOverview(data)}</div>
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
