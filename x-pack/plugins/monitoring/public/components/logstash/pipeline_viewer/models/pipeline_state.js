/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Config } from './config';

export class PipelineState {
  constructor(pipelineState) {
    this.config = new Config();
    this.update(pipelineState);
  }

  update(pipelineJson) {
    this.config.update(pipelineJson.representation);
  }
}
