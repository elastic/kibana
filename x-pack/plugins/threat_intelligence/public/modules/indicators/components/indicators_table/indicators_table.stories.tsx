/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { DEFAULT_DATE_FORMAT, DEFAULT_DATE_FORMAT_TZ } from '../../../../../common/constants';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { IndicatorsTable } from './indicators_table';

export default {
  component: IndicatorsTable,
  title: 'IndicatorsTable',
};

const indicatorsFixture: Indicator[] = Array(10).fill(generateMockIndicator());
const mockIndexPattern: DataView[] = [];

const stub = () => void 0;

const coreMock = {
  uiSettings: {
    get: (key: string) => {
      const settings = {
        [DEFAULT_DATE_FORMAT]: '',
        [DEFAULT_DATE_FORMAT_TZ]: 'UTC',
      };
      // @ts-expect-error
      return settings[key];
    },
  },
} as unknown as CoreStart;

const KibanaReactContext = createKibanaReactContext(coreMock);

export function WithIndicators() {
  return (
    <KibanaReactContext.Provider>
      <IndicatorsTable
        firstLoad={false}
        loading={false}
        pagination={{
          pageSize: 10,
          pageIndex: 0,
          pageSizeOptions: [10, 25, 50],
        }}
        indicators={indicatorsFixture}
        onChangePage={stub}
        onChangeItemsPerPage={stub}
        indicatorCount={indicatorsFixture.length * 2}
        indexPatterns={mockIndexPattern}
      />
    </KibanaReactContext.Provider>
  );
}

export function WithNoIndicators() {
  return (
    <IndicatorsTable
      firstLoad={false}
      pagination={{
        pageSize: 10,
        pageIndex: 0,
        pageSizeOptions: [10, 25, 50],
      }}
      indicators={[]}
      onChangePage={stub}
      onChangeItemsPerPage={stub}
      indicatorCount={0}
      loading={false}
      indexPatterns={[]}
    />
  );
}
