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
import moment from 'moment';
import { NodeDefinition, RenderNode } from '../types';
import { useLoader } from '../state';

interface DateConvertState {
  column?: string;
  dateFormat?: string;
}

function DateConvert({ node, dispatch }: RenderNode<DateConvertState>) {
  const loader = useLoader();
  const { state, inputNodeIds } = node;
  const inputTables = inputNodeIds.map(id => loader.lastData[id]?.value);
  const table = inputTables[0];

  if (!table) {
    return <>Please run the visualization before converting dates</>;
  }

  return (
    <div>
      <EuiFormRow
        label={i18n.translate('xpack.pipeline_builder.dateConvert.columnSelectLabel', {
          defaultMessage: 'Column',
        })}
      >
        <EuiSelect
          value={state.column}
          options={[{ text: 'Select column', value: undefined }].concat(
            table.columns.map(({ id, dataType }) => ({ text: id }))
          )}
          onChange={e => {
            dispatch({
              type: 'SET_NODE',
              nodeId: node.id,
              newState: { ...node.state, column: e.target.value },
            });
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.pipeline_builder.dateConvert.dateFormatLabel', {
          defaultMessage: 'Input date format (moment)',
        })}
      >
        <EuiFieldText
          value={state.dateFormat}
          onChange={e => {
            dispatch({
              type: 'SET_NODE',
              nodeId: node.id,
              newState: { ...node.state, dateFormat: e.target.value },
            });
          }}
        />
      </EuiFormRow>
    </div>
  );
}

export const definition: NodeDefinition<DateConvertState> = {
  title: i18n.translate('xpack.pipeline_builder.joinNodeTitle', {
    defaultMessage: 'Convert a column to date',
  }),
  inputNodeTypes: ['table'],
  outputType: 'table',

  icon: 'calendar',

  initialize(): DateConvertState {
    return {};
  },

  renderReact: DateConvert,

  async run(node, inputs, inputNodeIds, deps) {
    const { state } = node;
    const values = inputNodeIds.map(i => inputs[i]?.value);
    if (!state.column || !values.length) {
      throw new Error('no values');
    }

    const table = values[0];

    return {
      columns: table.columns.map(c => (c.id === state.column ? { ...c, dataType: 'date' } : c)),
      rows: table.rows.map(r => ({
        ...r,
        [state.column]: moment(r[state.column], state.dateFormat).toDate(),
      })),
    };
  },
};
