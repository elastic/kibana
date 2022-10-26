/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StatItems, StatItemsProps } from './types';

export const useKpiMatrixStatus = (
  mappings: Readonly<StatItems[]>,
  id: string,
  from: string,
  to: string
): StatItemsProps[] =>
  mappings.map((stat) => ({
    ...stat,
    id,
    key: `kpi-summary-${stat.key}`,
    statKey: `${stat.key}`,
    from,
    to,
  }));
