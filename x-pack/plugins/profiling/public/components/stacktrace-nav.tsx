/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { EuiButtonGroup } from '@elastic/eui';

import { groupSamplesByCategory, TopNSample, TopNSamples } from '../../common/topn';

export const StackTraceNavigation = ({ index, projectID, n, timeRange, fetchTopN, setTopN }) => {
  const topnButtonGroupPrefix = 'topnButtonGroup';

  const topnButtons = [
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
  ];

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

    console.log(new Date().toISOString(), 'started payload retrieval');
    fetchTopN(topnValue[0].value, index, projectID, timeRange.unixStart, timeRange.unixEnd, n).then(
      (response: TopNSamples) => {
        console.log(new Date().toISOString(), 'finished payload retrieval');
        const samples = response.TopN;
        const subcharts = groupSamplesByCategory(samples);
        const samplesWithoutZero = samples.filter((sample: TopNSample) => sample.Count > 0);
        setTopN({ samples: samplesWithoutZero, subcharts });
        console.log(new Date().toISOString(), 'updated local state');
      }
    );
  }, [index, projectID, n, timeRange, toggleTopNSelected]);

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
