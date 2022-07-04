/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

export const FlameGraphNavigation = ({ index, projectID, n, timeRange, getter, setter }) => {
  useEffect(() => {
    console.log(new Date().toISOString(), 'started payload retrieval');
    getter(index, projectID, timeRange.unixStart, timeRange.unixEnd, n).then((response) => {
      console.log(new Date().toISOString(), 'finished payload retrieval');
      console.log(new Date().toISOString(), response);
      setter(response);
      console.log(new Date().toISOString(), 'updated local state');
    });
  }, [index, projectID, n, timeRange]);

  return <></>;
};
