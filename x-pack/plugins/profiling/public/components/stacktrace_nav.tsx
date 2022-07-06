/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { EuiButtonGroup } from '@elastic/eui';

import { groupSamplesByCategory, TopNSample, TopNSamples, TopNSubchart } from '../../common/topn';
import { TimeRange } from '../../common/types';

interface Props {
  index: string;
  projectID: number;
  n: number;
  timeRange: TimeRange;
  fetchTopN: (
    type: string,
    index: string,
    projectID: number,
    unixStart: number,
    unixEnd: number,
    n: number
  ) => Promise<TopNSamples>;
  setTopN: React.Dispatch<{ subcharts: TopNSubchart[]; samples: TopNSample[] }>;
}

export const StackTraceNavigation = ({
  index,
  projectID,
  n,
  timeRange,
  fetchTopN,
  setTopN,
}: Props) => {
  const topnButtonGroupPrefix = 'topnButtonGroup';

  const topnButtons = useMemo(
    () => [
      {
        id: `${topnButtonGroupPrefix}__0`,
        label: 'Containers',
        value: 'containers',
      },
      {
        id: `${topnButtonGroupPrefix}__1`,
        label: 'Deployments',
        value: 'deployments',
      },
      {
        id: `${topnButtonGroupPrefix}__2`,
        label: 'Threads',
        value: 'threads',
      },
      {
        id: `${topnButtonGroupPrefix}__3`,
        label: 'Hosts',
        value: 'hosts',
      },
      {
        id: `${topnButtonGroupPrefix}__4`,
        label: 'Traces',
        value: 'traces',
      },
    ],
    []
  );

  const [toggleTopNSelected, setToggleTopNSelected] = useState(`${topnButtonGroupPrefix}__0`);

  const onTopNChange = (optionId: string) => {
    if (optionId === toggleTopNSelected) {
      return;
    }
    setToggleTopNSelected(optionId);
  };

  useEffect(() => {
    const topnValue = topnButtons.filter((button) => {
      return button.id === toggleTopNSelected;
    });

    fetchTopN(topnValue[0].value, index, projectID, timeRange.unixStart, timeRange.unixEnd, n).then(
      (response: TopNSamples) => {
        const samples = response.TopN;
        const subcharts = groupSamplesByCategory(samples);
        const samplesWithoutZero = samples.filter((sample: TopNSample) => sample.Count > 0);
        setTopN({ samples: samplesWithoutZero, subcharts });
      }
    );
  }, [index, projectID, n, timeRange, toggleTopNSelected, fetchTopN, setTopN, topnButtons]);

  return (
    <div>
      <EuiButtonGroup
        legend="This is a basic group"
        options={topnButtons}
        idSelected={toggleTopNSelected}
        onChange={(id) => onTopNChange(id)}
      />
    </div>
  );
};
