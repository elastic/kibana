/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  Chart,
  Datum,
  ElementClickListener,
  Partition,
  PartitionLayout,
  Settings,
} from '@elastic/charts';
import { EuiText } from '@elastic/eui';
import type { PartitionElementEvent } from '@elastic/charts';
import type { Query } from '@kbn/es-query';
import { useHistory } from 'react-router-dom';
import { statusColors } from '../../../common/constants';
import type { BenchmarkStats } from '../../../../common/types';
import * as TEXT from '../translations';
import { encodeQuery } from '../../../common/navigation/query_utils';
import { allNavigationItems } from '../../../common/navigation/constants';

interface CloudPostureScoreChartProps {
  data: BenchmarkStats;
}

const getBenchmarkAndResultEvaluationQuery = (
  benchmarkName: string,
  evaluation: string
): Query => ({
  language: 'kuery',
  query: `rule.benchmark : "${benchmarkName}" and result.evaluation : "${evaluation}" `,
});

export const CloudPostureScoreChart = ({
  data: { totalPassed, totalFailed, name: benchmarkName },
}: CloudPostureScoreChartProps) => {
  const history = useHistory();

  if (totalPassed === undefined || totalFailed === undefined || name === undefined) return null;

  const handleElementClick: ElementClickListener = (elements) => {
    const [element] = elements as PartitionElementEvent[];
    const [layerValue] = element;
    const rollupValue = layerValue[0].groupByRollup as string;

    history.push({
      pathname: allNavigationItems.findings.path,
      search: encodeQuery(
        getBenchmarkAndResultEvaluationQuery(benchmarkName, rollupValue.toLowerCase())
      ),
    });
  };

  const total = totalPassed + totalFailed;
  const percentage = `${((totalPassed / total) * 100).toFixed(1)}%`;

  const data = [
    { label: TEXT.PASSED, value: totalPassed },
    { label: TEXT.FAILEd, value: totalFailed },
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Chart size={{ height: 200 }}>
        <Settings onElementClick={handleElementClick} />
        <Partition
          id={benchmarkName || 'score_chart'}
          data={data}
          valueGetter="percent"
          valueAccessor={(d: Datum) => d.value as number}
          layers={[
            {
              groupByRollup: (d: Datum) => d.label,
              shape: {
                fillColor: (d, index) =>
                  d.dataName === 'Passed' ? statusColors.success : statusColors.danger,
              },
            },
          ]}
          config={{
            partitionLayout: PartitionLayout.sunburst,
            linkLabel: { maximumSection: Infinity, maxCount: 0 },
            outerSizeRatio: 0.9,
            emptySizeRatio: 0.8,
          }}
        />
      </Chart>
      <EuiText style={{ position: 'absolute', fontSize: 36, fontWeight: 'bold' }}>
        {percentage}
      </EuiText>
    </div>
  );
};
