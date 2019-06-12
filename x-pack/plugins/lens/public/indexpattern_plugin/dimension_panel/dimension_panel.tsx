/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { DatasourceDimensionPanelProps } from '../../types';
import { IndexPatternColumn, IndexPatternPrivateState, columnToOperation } from '../indexpattern';

import { getPotentialColumns, operationDefinitionMap } from '../operations';
import { FieldSelect } from './field_select';
import { Settings } from './settings';

export type IndexPatternDimensionPanelProps = DatasourceDimensionPanelProps & {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
};

export function IndexPatternDimensionPanel(props: IndexPatternDimensionPanelProps) {
  const columns = getPotentialColumns(props.state, props.suggestedPriority);

  const filteredColumns = columns.filter(col => {
    return props.filterOperations(columnToOperation(col));
  });

  const selectedColumn: IndexPatternColumn | null = props.state.columns[props.columnId] || null;

  const ParamEditor =
    selectedColumn && operationDefinitionMap[selectedColumn.operationType].inlineOptions;

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={null}>
        <EuiFlexGroup alignItems="center">
          <Settings {...props} selectedColumn={selectedColumn} filteredColumns={filteredColumns} />
          <FieldSelect
            {...props}
            selectedColumn={selectedColumn}
            filteredColumns={filteredColumns}
          />
        </EuiFlexGroup>
      </EuiFlexItem>
      {ParamEditor && (
        <EuiFlexItem grow={2}>
          <ParamEditor state={props.state} setState={props.setState} columnId={props.columnId} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
