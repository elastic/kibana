/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import moment from 'moment';
import { uiModules } from 'ui/modules';
import { PipelineViewer } from 'plugins/monitoring/components/logstash/pipeline_viewer';
import { Pipeline } from 'plugins/monitoring/components/logstash/pipeline_viewer/models/pipeline';
import { List } from 'plugins/monitoring/components/logstash/pipeline_viewer/models/list';
import { PipelineState } from 'plugins/monitoring/components/logstash/pipeline_viewer/models/pipeline_state';

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringLogstashPipelineViewer', $injector => {
  const config = $injector.get('config');
  const dateFormat = config.get('dateFormat');

  const timeseriesTooltipXValueFormatter = xValue =>
    moment(xValue).format(dateFormat);

  return {
    restrict: 'E',
    scope: {
      pipeline: '=',
    },
    link: (scope, $el) => {
      const pipelineState = new PipelineState(scope.pipeline);

      scope.$watch('pipeline', updatedPipeline => {
        pipelineState.update(updatedPipeline);

        render(
          <PipelineViewer
            pipeline={List.fromPipeline(
              Pipeline.fromPipelineGraph(pipelineState.config.graph)
            )}
            timeseriesTooltipXValueFormatter={timeseriesTooltipXValueFormatter}
          />,
          $el[0]
        );
      });
    },
  };
});
