/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { Hit, PipelineListItemOptions } from '../../types';

export class PipelineListItem {
  public readonly id: string;
  public readonly description: string;
  public readonly last_modified: string;
  public readonly username: string;
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
  static fromUpstreamJSON(pipeline: Hit) {
    const opts = {
      id: pipeline._id,
      description: get(pipeline, '_source.description') as string,
      last_modified: get(pipeline, '_source.last_modified') as string,
      username: get(pipeline, '_source.username') as string,
    };

    return new PipelineListItem(opts);
  }
}
