/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from '../../../../../../src/ui/public/chrome';
import { ROUTES } from '../../../common/constants';
import { PipelineListItem } from 'plugins/logstash/models/pipeline_list_item';

export class PipelinesService {
  constructor($http, Promise, monitoringService) {
    this.$http = $http;
    this.Promise = Promise;
    this.monitoringService = monitoringService;
    this.basePath = chrome.addBasePath(ROUTES.API_ROOT);
  }

  getPipelineList() {
    return this.Promise.all([
      this.getManagementPipelineList(),
      this.getMonitoringPipelineList()
    ])
      .then(([managementPipelines, monitoringPipelines]) => {
        // Merge centrally-managed pipelines with pipelines reported by monitoring. Take care to dedupe
        // while merging because monitoring will (rightly) report centrally-managed pipelines as well!
        const managementPipelineIds = managementPipelines.map(pipeline => pipeline.id);
        return managementPipelines.concat(
          monitoringPipelines.filter(monitoringPipeline => !managementPipelineIds.includes(monitoringPipeline.id))
        );
      });
  }

  getManagementPipelineList() {
    return this.$http.get(`${this.basePath}/pipelines`)
      .then(response => response.data.pipelines.map(pipeline => PipelineListItem.fromUpstreamJSON(pipeline)));
  }

  getMonitoringPipelineList() {
    return this.monitoringService.getPipelineList();
  }

  /**
   * Delete a collection of pipelines
   *
   * @param pipelineIds Array of pipeline IDs
   * @return Promise { numSuccesses, numErrors }
   */
  deletePipelines(pipelineIds) {
    // $http.delete does not take the request body as the 2nd argument. Instead it expects the 2nd
    // argument to be a request options object, one of which can be the request body (data). We also
    // need to explicity define the content type of the data.
    const requestOpts = {
      data: { pipelineIds },
      headers: { 'Content-Type': 'application/json' }
    };
    return this.$http.delete(`${this.basePath}/pipelines`, requestOpts)
      .then(response => response.data.results);
  }
}
