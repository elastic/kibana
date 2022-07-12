/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { ElasticFlameGraph } from '../../common/flamegraph';
import { TimeRange } from '../../common/types';

interface Props {
  index: string;
  projectID: number;
  n: number;
  timeRange: TimeRange;
  kuery: string;
  getter: (params: {
    index: string;
    projectID: number;
    timeFrom: number;
    timeTo: number;
    n: number;
    kuery: string;
  }) => Promise<ElasticFlameGraph>;
  setter: React.Dispatch<ElasticFlameGraph>;
}

export const FlameGraphNavigation = ({
  index,
  projectID,
  n,
  timeRange,
  getter,
  setter,
  kuery,
}: Props) => {
  useEffect(() => {
    getter({
      index,
      projectID,
      timeFrom: new Date(timeRange.start).getTime() / 1000,
      timeTo: new Date(timeRange.end).getTime() / 1000,
      n,
      kuery,
    }).then((response) => {
      setter(response);
    });
  }, [index, projectID, n, timeRange.start, timeRange.end, getter, setter, kuery]);

  return <></>;
};
