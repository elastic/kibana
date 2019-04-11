/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiTextArea } from '@elastic/eui';
import React, { useState } from 'react';
import { kfetch } from 'ui/kfetch';
import { BasicFieldType } from '../../../common';
import { Datasource, DatasourcePanelProps, DatasourcePlugin, VisModel } from '../../../public';
import { FieldListPanel } from '../../common/components/field_list_panel';

interface ESSQLColumn {
  name: string;
  type: BasicFieldType;
}

function DataPanel(props: DatasourcePanelProps<VisModel>) {
  const { visModel, onChangeVisModel } = props;
  const [text, updateText] = useState(visModel.datasource ? visModel.datasource.meta.sql : '');

  const updateDatasource = async () => {
    const resultColumns: ESSQLColumn[] = await kfetch({
      pathname: '/api/viz_editor/sqlfields',
      method: 'POST',
      body: JSON.stringify({
        sql: text,
      }),
    });

    const newDatasource: Datasource = {
      id: 'source',
      title: 'ESSQL Result',
      fields: resultColumns.map(({ name, type }) => ({
        name,
        type,
        aggregatable: false,
        searchable: false,
      })),
      meta: { sql: text },
    };

    onChangeVisModel({ ...visModel, datasource: newDatasource });
  };

  return (
    <>
      <EuiTextArea
        style={{ height: 400 }}
        fullWidth
        placeholder="Enter your ESSQL query here and use the resulting fields to build your viz"
        value={text}
        onChange={({ target: { value } }) => updateText(value)}
      />
      <EuiButton onClick={updateDatasource}>Apply</EuiButton>
      <FieldListPanel {...props} />
    </>
  );
}

function toExpression(viewState: VisModel) {
  if (Object.keys(viewState.queries).length === 0) {
    return '';
  }
  const firstQuery = Object.values(viewState.queries)[0];
  // TODO prob. do this on an AST object and stringify afterwards
  // return `sample_data`;
  return `essql query='${
    viewState.datasource ? viewState.datasource.meta.sql : ''
  }' | remap_essql keep='${
    viewState.datasource
      ? JSON.stringify(
          firstQuery.select.map(column => ('argument' in column ? column.argument.field : ''))
        )
      : '[]'
  }' columnNames='${
    viewState.datasource ? JSON.stringify(firstQuery.select.map(column => column.id)) : '[]'
  }' `;
}

export const config: DatasourcePlugin<VisModel> = {
  name: 'essql',
  toExpression,
  DataPanel,
  icon: 'sqlApp',
};
