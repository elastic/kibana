/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBasicTable } from '@elastic/eui';
import { State } from '../types';
import { nodeRegistry } from '../nodes';
import { useLoader, analyzeDag } from '../state';

export function TableRenderer(props: { state: State }) {
  const loader = useLoader();
  const analyzed = analyzeDag(props.state);
  const finalTableNodes = analyzed.filter(
    a => a.isTerminalNode && nodeRegistry[a.node.type].outputType === 'table'
  );
  return (
    <div className="pipelineBuilder__tableRenderer">
      {finalTableNodes.map(a => {
        const table = loader.lastData[a.id];
        if (!table?.value) {
          return null;
        }

        return (
          <EuiBasicTable
            columns={table.value.columns.map(col => ({
              field: col.id,
              name: col.label,
            }))}
            items={table.value.rows}
            tableLayout="auto"
          />
        );
      })}
    </div>
  );
}
