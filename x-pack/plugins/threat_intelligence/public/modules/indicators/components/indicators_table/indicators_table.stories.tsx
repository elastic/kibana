/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { generateMockIndicator, Indicator } from '../../../../../common/types/Indicator';
import { IndicatorsTable } from '.';

export default {
  component: IndicatorsTable,
  title: 'IndicatorsTable',
};

const indicatorsFixture: Indicator[] = Array(10).fill(generateMockIndicator());

const stub = () => void 0;

export function WithIndicators() {
  return (
    <IndicatorsTable
      loadData={stub}
      firstLoad={false}
      pagination={{
        pageSize: 10,
        pageIndex: 0,
        pageSizeOptions: [10, 25, 50],
      }}
      indicators={indicatorsFixture}
      onChangePage={stub}
      onChangeItemsPerPage={stub}
      indicatorCount={indicatorsFixture.length * 2}
    />
  );
}
