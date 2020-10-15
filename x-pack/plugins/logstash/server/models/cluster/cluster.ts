/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

/**
 * This model deals with a cluster object from ES and converts it to Kibana downstream
 */
export class Cluster {
  public readonly uuid: string;
  constructor({ uuid }: { uuid: string }) {
    this.uuid = uuid;
  }

  public get downstreamJSON() {
    const json = {
      uuid: this.uuid,
    };

    return json;
  }

  // generate Pipeline object from elasticsearch response
  static fromUpstreamJSON(upstreamCluster: Record<string, string>) {
    const uuid = get(upstreamCluster, 'cluster_uuid') as string;
    return new Cluster({ uuid });
  }
}
