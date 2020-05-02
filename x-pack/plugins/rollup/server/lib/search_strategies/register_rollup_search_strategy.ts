/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AbstractSearchRequest,
  DefaultSearchCapabilities,
  AbstractSearchStrategy,
} from '../../../../../../src/plugins/vis_type_timeseries/server';
import { CallWithRequestFactoryShim } from '../../types';
import { getRollupSearchStrategy } from './rollup_search_strategy';
import { getRollupSearchRequest } from './rollup_search_request';
import { getRollupSearchCapabilities } from './rollup_search_capabilities';

export const registerRollupSearchStrategy = (
  callWithRequestFactory: CallWithRequestFactoryShim,
  addSearchStrategy: (searchStrategy: any) => void
) => {
  const RollupSearchRequest = getRollupSearchRequest(AbstractSearchRequest);
  const RollupSearchCapabilities = getRollupSearchCapabilities(DefaultSearchCapabilities);
  const RollupSearchStrategy = getRollupSearchStrategy(
    AbstractSearchStrategy,
    RollupSearchRequest,
    RollupSearchCapabilities,
    callWithRequestFactory
  );

  addSearchStrategy(new RollupSearchStrategy());
};
