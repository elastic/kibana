/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'src/core/server';
import {
  DefaultSearchCapabilities,
  AbstractSearchStrategy,
  ReqFacade,
} from '../../../../../../src/plugins/vis_type_timeseries/server';
import { getRollupSearchStrategy } from './rollup_search_strategy';
import { getRollupSearchCapabilities } from './rollup_search_capabilities';

export const registerRollupSearchStrategy = (
  addSearchStrategy: (searchStrategy: any) => void,
  getRollupService: (reg: ReqFacade) => Promise<ILegacyScopedClusterClient>
) => {
  const RollupSearchCapabilities = getRollupSearchCapabilities(DefaultSearchCapabilities);
  const RollupSearchStrategy = getRollupSearchStrategy(
    AbstractSearchStrategy,
    RollupSearchCapabilities,
    getRollupService
  );

  addSearchStrategy(new RollupSearchStrategy());
};
