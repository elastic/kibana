/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  Axis,
  BarSeries,
  Chart,
  Datum,
  Goal,
  Partition,
  PartitionLayout,
  Settings,
} from '@elastic/charts';
import { EuiText, euiPaletteForStatus } from '@elastic/eui';
import { CspData } from './charts_data_types';
import { useNavigateToCSPFindings } from '../../../common/hooks/use_navigate_to_csp_findings';

const mock = {
  totalPassed: 800,
  totalFailed: 300,
};
const [green, , red] = euiPaletteForStatus(3);

export const CloudPostureScoreChart = ({
  totalPassed = mock.totalPassed,
  totalFailed = mock.totalFailed,
  name: benchmarkName = 'benchmark_mock',
}: CspData & { name: string }) => {
  const { navigate } = useNavigateToCSPFindings();

  const handleElementClick = (e) => {
    const [data] = e;
    const [groupsData, chartData] = data;
    // const query = `rule.benchmark : ${benchmarkName} and result.evaluation : ${groupsData[0].groupByRollup.toLowerCase()}`;
    // console.log(query);

    navigate(
      `(language:kuery,query:'rule.benchmark : "${benchmarkName}" and result.evaluation : ${groupsData[0].groupByRollup.toLowerCase()}')`
    );
  };

  const total = totalPassed + totalFailed;
  const percentage = `${((totalPassed / total) * 100).toFixed(1)}%`;

  const data = useMemo(
    () => [
      { label: 'Passed', value: totalPassed },
      { label: 'Failed', value: totalFailed },
    ],
    [totalFailed, totalPassed]
  );

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
                fillColor: (d, index) => (d.dataName === 'Passed' ? green : red),
              },
            },
          ]}
          config={{
            partitionLayout: PartitionLayout.sunburst,
            linkLabel: { maximumSection: Infinity, maxCount: 0 },
            outerSizeRatio: 0.9, // - 0.5 * Math.random(),
            emptySizeRatio: 0.8,
            // circlePadding: 4,
            // fontFamily: 'Arial',
          }}
        />
      </Chart>
      <EuiText style={{ position: 'absolute', fontSize: 36, fontWeight: 'bold' }}>
        {percentage}
      </EuiText>
    </div>
  );
};
