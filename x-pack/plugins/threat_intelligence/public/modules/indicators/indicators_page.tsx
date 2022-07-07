/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { IndicatorsTable } from './components/indicators_table/indicators_table';
import { useIndicators } from './hooks/use_indicators';

export const IndicatorsPage: VFC = () => {
  const indicators = useIndicators();

  return <IndicatorsTable {...indicators} />;
};
