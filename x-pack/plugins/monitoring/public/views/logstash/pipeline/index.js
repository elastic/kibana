/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Logstash Node Pipeline View
 */
import React from 'react';
import uiRoutes from'ui/routes';
import moment from 'moment';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { CALCULATE_DURATION_SINCE } from '../../../../common/constants';
import { formatTimestampToDuration } from '../../../../common/format_timestamp_to_duration';
import template from './index.html';
import { i18n } from '@kbn/i18n';
import { List } from 'plugins/monitoring/components/logstash/pipeline_viewer/models/list';
import { PipelineState } from 'plugins/monitoring/components/logstash/pipeline_viewer/models/pipeline_state';
import { PipelineViewer } from 'plugins/monitoring/components/logstash/pipeline_viewer';
import { Pipeline } from 'plugins/monitoring/components/logstash/pipeline_viewer/models/pipeline';
import { vertexFactory } from 'plugins/monitoring/components/logstash/pipeline_viewer/models/graph/vertex_factory';
import { MonitoringViewBaseController } from '../../base_controller';
import { I18nContext } from 'ui/i18n';
import {
  EuiPageBody,
  EuiPage,
  EuiPageContent,
} from '@elastic/eui';

let previousPipelineHash = undefined;
let detailVertexId = undefined;

function getPageData($injector) {
  const $route = $injector.get('$route');
  const $http = $injector.get('$http');
  const globalState = $injector.get('globalState');
  const minIntervalSeconds = $injector.get('minIntervalSeconds');
  const Private = $injector.get('Private');

  const { ccs, cluster_uuid: clusterUuid } = globalState;
  const pipelineId = $route.current.params.id;
  const pipelineHash = $route.current.params.hash || '';

  // Pipeline version was changed, so clear out detailVertexId since that vertex won't
  // exist in the updated pipeline version
  if (pipelineHash !== previousPipelineHash) {
    previousPipelineHash = pipelineHash;
    detailVertexId = undefined;
  }

  const url = pipelineHash
    ? `../api/monitoring/v1/clusters/${clusterUuid}/logstash/pipeline/${pipelineId}/${pipelineHash}`
    : `../api/monitoring/v1/clusters/${clusterUuid}/logstash/pipeline/${pipelineId}`;
  return $http.post(url, {
    ccs,
    detailVertexId
  })
    .then(response => response.data)
    .then(data => {
      data.versions = data.versions.map(version => {
        const relativeFirstSeen = formatTimestampToDuration(version.firstSeen, CALCULATE_DURATION_SINCE);
        const relativeLastSeen = formatTimestampToDuration(version.lastSeen, CALCULATE_DURATION_SINCE);

        const fudgeFactorSeconds = 2 * minIntervalSeconds;
        const isLastSeenCloseToNow = (Date.now() - version.lastSeen) <= fudgeFactorSeconds * 1000;

        return {
          ...version,
          relativeFirstSeen: i18n.translate('xpack.monitoring.logstash.pipeline.relativeFirstSeenAgoLabel', {
            defaultMessage: '{relativeFirstSeen} ago', values: { relativeFirstSeen }
          }),
          relativeLastSeen: isLastSeenCloseToNow ?
            i18n.translate('xpack.monitoring.logstash.pipeline.relativeLastSeenNowLabel', {
              defaultMessage: 'now'
            })
            : i18n.translate('xpack.monitoring.logstash.pipeline.relativeLastSeenAgoLabel', {
              defaultMessage: 'until {relativeLastSeen} ago', values: { relativeLastSeen }
            })
        };
      });

      return data;
    })
    .catch((err) => {
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}

uiRoutes.when('/logstash/pipelines/:id/:hash?', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
    pageData: getPageData
  },
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      const config = $injector.get('config');
      const dateFormat = config.get('dateFormat');

      super({
        title: i18n.translate('xpack.monitoring.logstash.pipeline.routeTitle', {
          defaultMessage: 'Logstash - Pipeline'
        }),
        storageKey: 'logstash.pipelines',
        getPageData,
        reactNodeId: 'monitoringLogstashPipelineApp',
        $scope,
        options: {
          enableTimeFilter: false,
        },
        $injector
      });

      const timeseriesTooltipXValueFormatter = xValue =>
        moment(xValue).format(dateFormat);

      const setDetailVertexId = vertex => {
        if (!vertex) {
          detailVertexId = undefined;
        } else {
          detailVertexId = vertex.id;
        }

        return this.updateData();
      };

      $scope.$watch(() => this.data, data => {
        if (!data || !data.pipeline) {
          return;
        }
        this.pipelineState = new PipelineState(data.pipeline);
        this.detailVertex = data.vertex ? vertexFactory(null, data.vertex) : null;
        this.renderReact(
          <I18nContext>
            <EuiPage>
              <EuiPageBody>
                <EuiPageContent>
                  <PipelineViewer
                    pipeline={List.fromPipeline(
                      Pipeline.fromPipelineGraph(this.pipelineState.config.graph)
                    )}
                    timeseriesTooltipXValueFormatter={timeseriesTooltipXValueFormatter}
                    setDetailVertexId={setDetailVertexId}
                    detailVertex={this.detailVertex}
                  />
                </EuiPageContent>
              </EuiPageBody>
            </EuiPage>
          </I18nContext>
        );
      });

      $scope.$on('$destroy', () => {
        previousPipelineHash = undefined;
        detailVertexId = undefined;
      });
    }
  }
});
