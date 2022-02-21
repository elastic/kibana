/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorrelationsParams } from '../../../../common/correlations/types';

export const getRequestBase = ({
  index,
  includeFrozen,
}: CorrelationsParams) => ({
  index,
  // matches APM's event client settings
  ...(includeFrozen ? { ignore_throttled: false } : {}),
  ignore_unavailable: true,
});
