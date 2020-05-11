/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiSelect, EuiFlexItem, EuiFlexGroup, EuiFieldText } from '@elastic/eui';
import { sortBy } from 'lodash';
import { templateFromReactComponent } from '../../../../public/lib/template_from_react_component';

const maybeQuoteValue = val => (val.match(/\s/) ? `'${val}'` : val);

class ModelcolumnArgInput extends Component {
  inputRefs = {};

  render() {
    const { onValueChange, columns, argValue, argId, typeInstance } = this.props;

    const allowedTypes = typeInstance.options.allowedTypes || false;

    const updateFunctionValue = () => {
      const type = this.inputRefs.type.value;
      const column = this.inputRefs.column.value;

      onValueChange({
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'modelcolumnarg',
            arguments: {
              column: [column],
              dataType: [type],
            },
          },
        ],
      });
    };

    const columnId = argValue.chain[0].arguments.column[0];

    const column = columns.map(col => col.name).find(colName => colName === columnId) || '';
    const type = argValue.chain[0].arguments.dataType[0];

    const options = [{ value: '', text: 'select column', disabled: true }];

    sortBy(columns, 'name').forEach(column => {
      if (allowedTypes && !allowedTypes.includes(column.type)) {
        return;
      }
      options.push({ value: column.name, text: column.name });
    });

    return (
      <EuiFlexGroup gutterSize="s" id={argId} direction="column">
        <EuiFlexItem>
          <EuiSelect
            compressed
            options={options}
            value={column}
            inputRef={ref => (this.inputRefs.column = ref)}
            onChange={updateFunctionValue}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSelect
            compressed
            options={[
              { value: 'date', text: 'date' },
              { value: 'number', text: 'number' },
              { value: 'string', text: 'string' },
              { value: 'boolean', text: 'boolean' },
            ]}
            value={type}
            inputRef={ref => (this.inputRefs.type = ref)}
            onChange={updateFunctionValue}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldText placeholder="New name" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}

export const modelcolumn = () => ({
  name: 'modelcolumnarg',
  displayName: 'Model column',
  args: [
    {
      name: 'column',
      displayName: 'Column',
      argType: 'string',
    },
    {
      name: 'type',
      displayName: 'Type',
      argType: 'string',
    },
  ],
  simpleTemplate: templateFromReactComponent(ModelcolumnArgInput),
});
