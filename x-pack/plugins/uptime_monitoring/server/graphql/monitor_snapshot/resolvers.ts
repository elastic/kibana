/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMResolver } from '../../../common/graphql/resolver_types';
import { Snapshot } from '../../../common/graphql/types';
import { UMServerLibs } from '../../lib/lib';
import { CreateUMGraphQLResolvers, UMContext } from '../types';

export type UMSnapshotResolver = UMResolver<
  Snapshot | Promise<Snapshot>,
  any,
  GetSnapshotArgs,
  UMContext
>;

interface GetSnapshotArgs {
  start: number;
  end: number;
  downCount: number;
  windowSize: number;
}

export const createSnapshotResolvers: CreateUMGraphQLResolvers = (
  libs: UMServerLibs
): {
  Query: {
    getSnapshot: UMSnapshotResolver;
  };
} => ({
  Query: {
    async getSnapshot(resolver, args, { req }): Promise<Snapshot> {
      const { start, end, downCount, windowSize } = args;
      const { up, down, trouble } = await libs.monitors.getSnapshotCount(
        req,
        { start, end },
        downCount,
        windowSize
      );
      return {
        up,
        down,
        // @ts-ignore TODO update typings and remove this comment
        trouble,
        total: up + down + trouble,
        histogram: await libs.pings.getHist(req, { start, end }),
      };
    },
  },
});
