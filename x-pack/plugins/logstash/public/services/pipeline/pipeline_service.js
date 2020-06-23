/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ROUTES } from '../../../common/constants';
import { Pipeline } from '../../models/pipeline';

export class PipelineService {
  constructor(http, pipelinesService) {
    this.http = http;
    this.pipelinesService = pipelinesService;
  }

  loadPipeline(id) {
    return this.http.get(`${ROUTES.API_ROOT}/pipeline/${id}`).then((response) => {
      return Pipeline.fromUpstreamJSON(response);
    });
  }

  savePipeline(pipelineModel) {
    return this.http
      .put(`${ROUTES.API_ROOT}/pipeline/${pipelineModel.id}`, {
        body: JSON.stringify(pipelineModel.upstreamJSON),
      })
      .catch((e) => {
        throw e.message;
      });
  }

  deletePipeline(id) {
    return this.http
      .delete(`${ROUTES.API_ROOT}/pipeline/${id}`)
      .then(() => this.pipelinesService.addToRecentlyDeleted(id))
      .catch((e) => {
        throw e.message;
      });
  }
}
