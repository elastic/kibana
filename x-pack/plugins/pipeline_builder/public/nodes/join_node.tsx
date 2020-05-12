/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldText, EuiProgress } from '@elastic/eui';
import { NodeDefinition, RenderNode } from '../types';
import { useLoader } from '../state';

interface JoinNodeState {
  joinColumn?: string;
  joinType?: 'inner';
}

function JoinNode({ node, dispatch }: RenderNode<JoinNodeState>) {
  const loader = useLoader();
  return (
    <div>
      {loader.lastData[node.id]?.loading ? <EuiProgress /> : null}

      {/* <EuiFormRow
        label={i18n.translate('xpack.pipeline_builder.joinNode.endpointLabel', {
          defaultMessage: 'Endpoint path',
        })}
      >
        <EuiFieldText
          value={node.state.endpoint}
          onChange={e => {
            dispatch({
              type: 'SET_NODE',
              nodeId: node.id,
              newState: { ...node.state, endpoint: e.target.value },
            });
          }}
        />
      </EuiFormRow> */}
    </div>
  );
}

export const definition: NodeDefinition<JoinNodeState> = {
  title: i18n.translate('xpack.pipeline_builder.joinNodeTitle', {
    defaultMessage: 'Join two nodes',
  }),
  inputNodeTypes: ['table'],
  outputType: 'table',

  icon: 'aggregate',

  initialize(): JoinNodeState {
    return {};
  },

  renderReact: JoinNode,

  async run(state, inputs, deps) {
    return {
      aggregations: {
        buckets: [
          {
            key: 'A',
            value: 100,
          },
          {
            key: 'B',
            value: 200,
          },
        ],
      },
    };
  },
};
