/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchStrategyParams } from '../../../../common/search_strategies/types';

export const getRequestBase = ({
  index,
  includeFrozen,
}: SearchStrategyParams) => ({
  index,
  // matches APM's event client settings
  ignore_throttled: includeFrozen === undefined ? true : !includeFrozen,
  ignore_unavailable: true,
});
