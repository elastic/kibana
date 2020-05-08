/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiButton, EuiProgress } from '@elastic/eui';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { State, DispatchFn, PipelineAppDeps } from '../types';
import { nodeRegistry } from '../nodes';
import { renderersRegistry } from '../renderers';
import { useLoader } from '../state';

export function Layout({ state, dispatch }: { state: State; dispatch: DispatchFn }) {
  const { services } = useKibana<PipelineAppDeps>();
  const { data } = services;
  const loader = useLoader();

  return (
    <>
      {state.loading === true ? <EuiProgress /> : null}

      <EuiButton
        onClick={() => {
          dispatch({
            type: 'CREATE_NODE',
            nodeType: 'search',
            inputNodes: [],
          });
        }}
      >
        {i18n.translate('xpack.pipeline_builder.createNodeButtonLabel', {
          defaultMessage: 'Create node',
        })}
      </EuiButton>

      <EuiButton
        onClick={() => {
          loader.run(state, { data });
        }}
      >
        {i18n.translate('xpack.pipeline_builder.runButtonLabel', {
          defaultMessage: 'Run',
        })}
      </EuiButton>

      {Object.entries(state.nodes).map(([id, node]) => (
        <div key={id}>
          {nodeRegistry[node.type].renderReact({
            node,
            dispatch,
          })}
        </div>
      ))}

      {Object.entries(renderersRegistry).map(([id, renderer]) => (
        <div key={id}>{renderer({ state })}</div>
      ))}
    </>
  );
}
