/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiButton, EuiSuperSelect, EuiTextArea } from '@elastic/eui';
import React, { useState } from 'react';
import { kfetch } from 'ui/kfetch';
import { FieldListPanel } from '../public/common/components/field_list_panel';
import { Datasource, updatePrivateState, VisModel } from '../public/common/lib';
import { DatasourcePlugin, PanelComponentProps } from '../public/datasource_plugin_registry';

interface EssqlPrivateState {
  sql: string;
}
type EssqlVisModel = VisModel<'essql', EssqlPrivateState>;

const updateEssqlState = updatePrivateState<'essql', EssqlPrivateState>('essql');
const updateSql = (visModel: EssqlVisModel, sql: string) => updateEssqlState(visModel, { sql });

function dataPanel({ visModel, onChangeVisModel }: PanelComponentProps<EssqlVisModel>) {
  const [text, updateText] = useState(visModel.private.essql.sql);

  const updateDatasource = async () => {
    const resultColumns: Array<{ name: string; type: string }> = await kfetch({
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
    };

    const updatedVisModel = { ...visModel, datasources: { source: newDatasource } };
    onChangeVisModel(updateSql(updatedVisModel, text));
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
      <FieldListPanel datasources={visModel.datasources} />
    </>
  );
}

function toExpression(viewState: EssqlVisModel) {
  // TODO prob. do this on an AST object and stringify afterwards
  // return `sample_data`;
  return `essql query='${viewState.private.essql.sql}'`;
}

export const config: DatasourcePlugin<EssqlVisModel> = {
  name: 'essql',
  toExpression,
  DataPanel: dataPanel,
};
