/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
// @ts-ignore
import CustomPlot from './';

storiesOf('shared/charts/CustomPlot', module).add(
  'with annotations but no data',
  () => {
    const annotations = [
      {
        type: 'version',
        id: '2020-06-10 04:36:31',
        '@timestamp': 1591763925012,
        text: '2020-06-10 04:36:31',
      },
      {
        type: 'version',
        id: '2020-06-10 15:23:01',
        '@timestamp': 1591802689233,
        text: '2020-06-10 15:23:01',
      },
    ];
    return <CustomPlot annotations={annotations} series={[]} />;
  },
  {
    info: {
      source: false,
      text:
        "When a chart has no data but does have annotations, the annotations shouldn't show up at all.",
    },
  }
);
