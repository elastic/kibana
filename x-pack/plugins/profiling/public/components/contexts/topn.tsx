/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { TopNSample, TopNSubchart } from '../../../common/topn';

export const TopNContext = createContext<{ subcharts: TopNSubchart[]; samples: TopNSample[] }>({
  subcharts: [],
  samples: [],
});
