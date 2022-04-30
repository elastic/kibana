/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Cluster } from './cluster';

describe('cluster', () => {
  describe('Cluster', () => {
    describe('fromUpstreamJSON factory method', () => {
      const upstreamJSON = {
        cluster_uuid: 'S-S4NNZDRV-g9c-JrIhx6A',
      } as estypes.InfoResponse;

      it('returns correct Cluster instance', () => {
        const cluster = Cluster.fromUpstreamJSON(upstreamJSON);
        expect(cluster.uuid).toEqual(upstreamJSON.cluster_uuid);
      });
    });
  });
});
