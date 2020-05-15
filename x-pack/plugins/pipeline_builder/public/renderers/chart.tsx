/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCodeBlock, EuiAccordion } from '@elastic/eui';
import { Chart, Settings, BarSeries } from '@elastic/charts';
import { State } from '../types';
import { nodeRegistry } from '../nodes';
import { useLoader, analyzeDag } from '../state';

export function ChartRenderer(props: { state: State }) {
  const loader = useLoader();
  const analyzed = analyzeDag(props.state);

  const terminals = analyzed.filter(
    a => a.isTerminalNode && nodeRegistry[a.node.type].outputType === 'table'
  );
  const terminalData = terminals
    .map(a => loader.lastData[a.id]?.value)
    .filter(data => {
      return data && data.columns?.length > 1 && data.columns?.length <= 3;
    });

  if (!terminalData.length) {
    return <span>No nodes have tabular data</span>;
  }

  return (
    <div style={{ height: '200px' }}>
      <Chart>
        <Settings />
        {terminalData.map((data, index) => {
          return (
            <BarSeries
              id={'bar'}
              key={index}
              data={data.rows}
              xAccessor={data.columns[0].id}
              yAccessors={[data.columns[1].id]}
            />
          );
        })}
      </Chart>
    </div>
  );
}
