/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Chart, Datum, Partition, PartitionLayout, Settings } from '@elastic/charts';
import { EuiText } from '@elastic/eui';
import { useNavigateToCSPFindings } from '../../../common/hooks/use_navigate_to_csp_findings';
import type { BenchmarkStats } from '../../../../common/types';
import { statusColors } from '../../../common/constants';

interface CloudPostureScoreChartProps {
  data: BenchmarkStats;
}

export const CloudPostureScoreChart = ({
  data: { totalPassed, totalFailed, name: benchmarkName },
}: CloudPostureScoreChartProps) => {
  const { navigate } = useNavigateToCSPFindings();
  if (totalPassed === undefined || totalFailed === undefined || name === undefined) return null;

  // TODO: add type
  // @ts-ignore
  const handleElementClick = (e) => {
    const [data] = e;
    const [groupsData] = data;

    navigate(
      `(language:kuery,query:'rule.benchmark : "${benchmarkName}" and result.evaluation : ${groupsData[0].groupByRollup.toLowerCase()}')`
    );
  };

  const total = totalPassed + totalFailed;
  const percentage = `${((totalPassed / total) * 100).toFixed(1)}%`;

  const data = [
    { label: 'Passed', value: totalPassed },
    { label: 'Failed', value: totalFailed },
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
