/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiFieldText,
  EuiProgress,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { parse, codegen } from 'vega-expressions';
import { NodeDefinition, RenderNode } from '../types';
import { useLoader } from '../state';

interface Table {
  columns: Array<{ id: string; label?: string }>;
  rows: Array<Record<string, unknown>>;
}

interface CalculatedColumnState {
  outputColumnId?: string;
  formula?: string;
}

function CalculatedColumn({ node, dispatch }: RenderNode<CalculatedColumnState>) {
  const loader = useLoader();
  const { state, inputNodeIds } = node;
  const inputTables = inputNodeIds.map(id => loader.lastData[id]?.value);

  return (
    <div>
      <EuiFormRow
        label={i18n.translate('xpack.pipeline_builder.calculatedColumn.outputColumnId', {
          defaultMessage: 'Output column id',
        })}
      >
        <EuiFieldText
          value={state.outputColumnId}
          onChange={e => {
            dispatch({
              type: 'SET_NODE',
              nodeId: node.id,
              newState: { ...node.state, outputColumnId: e.target.value },
            });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.pipeline_builder.calculatedColumn.formula', {
          defaultMessage: 'Formula',
        })}
      >
        <EuiFieldText
          value={state.formula}
          onChange={e => {
            dispatch({
              type: 'SET_NODE',
              nodeId: node.id,
              newState: { ...node.state, formula: e.target.value },
            });
          }}
        />
      </EuiFormRow>
    </div>
  );
}

export const definition: NodeDefinition<CalculatedColumnState> = {
  title: i18n.translate('xpack.pipeline_builder.calculatedColumnTitle', {
    defaultMessage: 'Calculated column',
  }),
  inputNodeTypes: ['table'],
  outputType: 'table',

  icon: 'aggregate',

  initialize(): CalculatedColumnState {
    return {};
  },

  renderReact: CalculatedColumn,

  async run(state, inputs, inputNodeIds, deps) {
    const value = inputs[inputNodeIds[0]]?.value;

    const { outputColumnId, formula } = state;
    if (!outputColumnId || !formula) {
      return value;
    }

    const rows = value.rows.map(row => {
      return {
        ...row,
        [outputColumnId]: 'calculated',
      };
    });

    return {
      columns: value.columns.concat({ id: outputColumnId }),
      rows,
    };
  },
};
