/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import React from 'react';
import { ElasticFlameGraph } from '@kbn/profiling-data-access-plugin/common/flamegraph';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { FlameGraph } from '../components/flamegraph';

interface Props {
  data?: ElasticFlameGraph;
}

export function EmbeddableFlamegraph({ data }: Props) {
  return (
    <EuiPanel>
      <EuiFlexGroup direction="column" style={{ height: '100%' }}>
        <EuiFlexItem>
          {data && (
            <FlameGraph
              primaryFlamegraph={data}
              showInformationWindow={false}
              id="embddable_profiling"
              toggleShowInformationWindow={() => {}}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* <div style={{ height: '100%' }}>
      </div> */}
    </EuiPanel>
  );
}
