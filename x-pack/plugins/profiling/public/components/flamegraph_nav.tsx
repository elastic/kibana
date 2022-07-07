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
  getter: (
    index: string,
    projectID: number,
    unixStart: number,
    unixEnd: number,
    n: number
  ) => Promise<ElasticFlameGraph>;
  setter: React.Dispatch<ElasticFlameGraph>;
}

export const FlameGraphNavigation = ({ index, projectID, n, timeRange, getter, setter }: Props) => {
  useEffect(() => {
    getter(
      index,
      projectID,
      new Date(timeRange.start).getTime(),
      new Date(timeRange.end).getTime(),
      n
    ).then((response) => {
      setter(response);
    });
  }, [index, projectID, n, timeRange.start, timeRange.end, getter, setter]);

  return <></>;
};
