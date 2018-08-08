/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import moment from 'moment-timezone';
import { uiModules } from 'ui/modules';
import 'ui/filters/moment';
import 'ui/check_box';
import 'ui/sortable_column';
import template from './pipeline_table.html';
import 'plugins/logstash/services/security';
import '../../../../components/tooltip';

const app = uiModules.get('xpack/logstash');

app.directive('pipelineTable', function ($injector) {
  const config = $injector.get('config');
  const securityService = $injector.get('logstashSecurityService');
  moment.tz.setDefault(config.get('dateFormat:tz'));

  return {
    restrict: 'E',
    template: template,
    scope: {
      pipelines: '=',
      sortField: '=',
      sortReverse: '=',
      onSortChange: '=',
      onSelectChange: '='
    },
    controllerAs: 'pipelineTable',
    bindToController: true,
    controller: class PipelineTableController {
      constructor($scope) {
        this.allSelected = false;
        $scope.$watch('pipelineTable.pipelines', (pipelines) => {
          const previousItems = this.items;

          this.items = _.map(pipelines, (pipeline) => {
            const matchedItem = _.find(previousItems, previousItem => previousItem.pipeline.id === pipeline.id);
            const selected = Boolean(_.get(matchedItem, 'selected'));
            return { pipeline: pipeline, selected: selected };
          });
          this.updateSelectedPipelines();
        });
      }

      onAllSelectedChange = (itemId, allSelected) => {
        this.items
          .filter(item => item.pipeline.isCentrallyManaged)
          .forEach(item => item.selected = allSelected);
        this.updateSelectedPipelines();
      };

      onPipelineSelectedChange = (pipelineId, selected) => {
        _.find(this.items, item => item.pipeline.id === pipelineId).selected = selected;
        this.updateSelectedPipelines();
      };

      updateSelectedPipelines = () => {
        const selectedItems = _.filter(this.items, item => item.selected);
        const selectedPipelines = _.map(selectedItems, item => item.pipeline);

        this.allSelected = selectedPipelines.length > 0
          && (selectedPipelines.length === this.items.filter(item => item.pipeline.isCentrallyManaged).length);
        this.onSelectChange(selectedPipelines);
      };

      get isSecurityEnabled() {
        return securityService.isSecurityEnabled;
      }
    }
  };
});
