/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBasicTable } from '@elastic/eui';
import { State } from '../types';
import { nodeRegistry } from '../nodes';
import { useLoader, getChainInformation } from '../state';

export function TableRenderer(props: { state: State }) {
  const loader = useLoader();
  const { startChains, otherChains } = getChainInformation(props.state.nodes);

  const terminals = otherChains.length
    ? otherChains.map(c => c[c.length - 1])
    : startChains.map(c => c[c.length - 1]);
  const terminalData = terminals
    .map(a => loader.lastData[a.id]?.value)
    .filter(data => {
      return data && data.columns && data.rows;
    });

  return (
    <div className="pipelineBuilder__tableRenderer">
      {terminalData.map(value => {
        return (
          <EuiBasicTable
            columns={value.columns.map(col => ({
              field: col.id,
              name: col.label,
            }))}
            items={value.rows}
            tableLayout="auto"
          />
        );
      })}
    </div>
  );
}
