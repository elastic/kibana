/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import moment from 'moment';
import { useRouteMatch } from 'react-router-dom';
import { useKibana, useUiSetting } from '@kbn/kibana-react-plugin/public';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { ComponentProps } from '../../route_init';
// @ts-ignore
import { List } from '../../../components/logstash/pipeline_viewer/models/list';
// @ts-ignore
import { PipelineViewer } from '../../../components/logstash/pipeline_viewer';
// @ts-ignore
import { Pipeline } from '../../../components/logstash/pipeline_viewer/models/pipeline';
// @ts-ignore
import { PipelineState } from '../../../components/logstash/pipeline_viewer/models/pipeline_state';
// @ts-ignore
import { vertexFactory } from '../../../components/logstash/pipeline_viewer/models/graph/vertex_factory';
import { LogstashTemplate } from './logstash_template';
import { useTable } from '../../hooks/use_table';
import { ExternalConfigContext } from '../../contexts/external_config_context';
import { formatTimestampToDuration } from '../../../../common';
import { CALCULATE_DURATION_SINCE } from '../../../../common/constants';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
import { PipelineVersions } from './pipeline_versions_dropdown';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';

export const LogStashPipelinePage: React.FC<ComponentProps> = ({ clusters }) => {
  const match = useRouteMatch<{ id: string | undefined; hash: string | undefined }>();
  const { hash: pipelineHash, id: pipelineId } = match.params;
  const globalState = useContext(GlobalStateContext);
  const { services } = useKibana<{ data: any }>();
  const clusterUuid = globalState.cluster_uuid;
  const { minIntervalSeconds } = useContext(ExternalConfigContext);

  const dateFormat = useUiSetting<string>('dateFormat');
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(null);
  const ccs = globalState.ccs;
  const cluster = find(clusters, {
    cluster_uuid: clusterUuid,
  }) as any;
  const [data, setData] = useState({} as any);
  const [detailVertexId, setDetailVertexId] = useState<string | null | undefined>(undefined);
  const { updateTotalItemCount } = useTable('logstash.pipelines');

  const title = i18n.translate('xpack.monitoring.logstash.pipeline.routeTitle', {
    defaultMessage: 'Logstash - Pipeline',
  });

  const pageTitle = i18n.translate('xpack.monitoring.logstash.pipeline.pageTitle', {
    defaultMessage: 'Logstash pipeline: {pipeline}',
    values: {
      pipeline: data.pipeline ? data.pipeline.id : '',
    },
  });

  const getPageData = useCallback(async () => {
    const url = pipelineHash
      ? `../api/monitoring/v1/clusters/${clusterUuid}/logstash/pipeline/${pipelineId}/${pipelineHash}`
      : `../api/monitoring/v1/clusters/${clusterUuid}/logstash/pipeline/${pipelineId}`;

    const response = await services.http?.fetch<any>(url, {
      method: 'POST',
      body: JSON.stringify({
        ccs,
        detailVertexId: detailVertexId || undefined,
      }),
    });
    const myData = response;

    myData.versions = myData.versions.map((version: any) => {
      const relativeFirstSeen = formatTimestampToDuration(
        version.firstSeen,
        CALCULATE_DURATION_SINCE
      );
      const relativeLastSeen = formatTimestampToDuration(
        version.lastSeen,
        CALCULATE_DURATION_SINCE
      );

      const fudgeFactorSeconds = 2 * minIntervalSeconds;
      const isLastSeenCloseToNow = Date.now() - version.lastSeen <= fudgeFactorSeconds * 1000;

      return {
        ...version,
        relativeFirstSeen: i18n.translate(
          'xpack.monitoring.logstash.pipeline.relativeFirstSeenAgoLabel',
          {
            defaultMessage: '{relativeFirstSeen} ago',
            values: { relativeFirstSeen },
          }
        ),
        relativeLastSeen: isLastSeenCloseToNow
          ? i18n.translate('xpack.monitoring.logstash.pipeline.relativeLastSeenNowLabel', {
              defaultMessage: 'now',
            })
          : i18n.translate('xpack.monitoring.logstash.pipeline.relativeLastSeenAgoLabel', {
              defaultMessage: 'until {relativeLastSeen} ago',
              values: { relativeLastSeen },
            }),
      };
    });
    setData(myData);
    updateTotalItemCount(response.totalNodeCount);
  }, [
    ccs,
    clusterUuid,
    services.http,
    updateTotalItemCount,
    detailVertexId,
    minIntervalSeconds,
    pipelineHash,
    pipelineId,
  ]);

  useEffect(() => {
    if (data.pipeline) {
      setPipelineState(new PipelineState(data.pipeline));
    }
  }, [data]);

  const timeseriesTooltipXValueFormatter = (xValue: any) => moment(xValue).format(dateFormat);
  const { generate: generateBreadcrumbs } = useContext(BreadcrumbContainer.Context);

  const onVertexChange = useCallback((vertex: any) => {
    if (!vertex) {
      setDetailVertexId(null);
    } else {
      setDetailVertexId(vertex.id);
    }
  }, []);

  useEffect(() => {
    if (detailVertexId !== undefined) {
      getPageData();
    }
  }, [detailVertexId, getPageData]);

  const onChangePipelineHash = useCallback(
    (hash) => {
      window.location.hash = getSafeForExternalLink(`#/logstash/pipelines/${pipelineId}/${hash}`);
    },
    [pipelineId]
  );

  useEffect(() => {
    if (cluster) {
      generateBreadcrumbs(cluster.cluster_name, {
        inLogstash: true,
        page: 'pipeline',
      });
    }
  }, [cluster, data, generateBreadcrumbs]);

  return (
    <LogstashTemplate
      tabsDisabled={true}
      title={title}
      pageTitle={pageTitle}
      getPageData={getPageData}
      cluster={cluster}
    >
      <div>
        <PipelineVersions
          pipelineVersions={data.versions}
          onChangePipelineHash={onChangePipelineHash}
          pipelineHash={pipelineHash}
        />
      </div>
      <div>
        {pipelineState && (
          <PipelineViewer
            pipeline={List.fromPipeline(Pipeline.fromPipelineGraph(pipelineState.config.graph))}
            timeseriesTooltipXValueFormatter={timeseriesTooltipXValueFormatter}
            setDetailVertexId={onVertexChange}
            detailVertex={data.vertex ? vertexFactory(null, data.vertex) : null}
          />
        )}
      </div>
    </LogstashTemplate>
  );
};
