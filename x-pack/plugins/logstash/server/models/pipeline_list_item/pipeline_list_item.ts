/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

interface PipelineListItemOptions {
  id: string;
  description: string;
  last_modified: string;
  username: string;
}
export class PipelineListItem {
  private readonly id: string;
  private readonly description: string;
  private readonly last_modified: string;
  private readonly username: string;
  constructor(options: PipelineListItemOptions) {
    this.id = options.id;
    this.description = options.description;
    this.last_modified = options.last_modified;
    this.username = options.username;
  }

  public get downstreamJSON() {
    const json = {
      id: this.id,
      description: this.description,
      last_modified: this.last_modified,
      username: this.username,
    };

    return json;
  }

  /**
   * Takes the json GET response from ES and constructs a pipeline model to be used
   * in Kibana downstream
   */
  static fromUpstreamJSON(pipeline: Record<string, any>) {
    const opts = {
      id: pipeline._id,
      description: get<string>(pipeline, '_source.description'),
      last_modified: get<string>(pipeline, '_source.last_modified'),
      username: get<string>(pipeline, '_source.username'),
    };

    return new PipelineListItem(opts);
  }
}
