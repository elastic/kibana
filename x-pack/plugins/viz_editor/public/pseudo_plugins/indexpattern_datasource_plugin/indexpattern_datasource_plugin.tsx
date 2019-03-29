/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBox } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { FieldListPanel } from '../../common/components/field_list_panel';
import { Datasource, VisModel } from '../../common/lib';
import { DatasourcePlugin, PanelComponentProps } from '../../datasource_plugin_registry';
import { getIndexPatterns } from './index_patterns';

interface DataPanelState {
  indexPatterns: Datasource[];
}

function DataPanel(props: PanelComponentProps<VisModel>) {
  const { visModel, onChangeVisModel } = props;

  const [state, setState] = useState({ indexPatterns: [] } as DataPanelState);

  useEffect(() => {
    getIndexPatterns().then(loadedIndexPatterns => {
      if (!loadedIndexPatterns) {
        return;
      }

      setState({ indexPatterns: loadedIndexPatterns });

      onChangeVisModel({
        ...visModel,
        // TODO: There is a default index pattern preference that is being ignored here
        datasource: loadedIndexPatterns.length ? loadedIndexPatterns[0] : null,
      });
    });
  }, []);

  const indexPatternsAsSelections = state.indexPatterns.map(({ title }) => ({
    label: title,
  }));

  return (
    <>
      <EuiComboBox
        options={indexPatternsAsSelections}
        singleSelection={{ asPlainText: true }}
        selectedOptions={indexPatternsAsSelections.filter(
          ({ label }) => visModel.datasource && label === visModel.datasource.title
        )}
        isClearable={false}
        onChange={([{ label }]) =>
          onChangeVisModel({
            ...visModel,
            datasource: state.indexPatterns.find(({ title }) => title === label) || null,
          })
        }
      />
      <FieldListPanel {...props} />
    </>
  );
}

function toExpression(viewState: VisModel) {
  // TODO prob. do this on an AST object and stringify afterwards
  // return `sample_data`;
  return `fancy_query queries='${JSON.stringify(viewState.queries)}' indexpattern='${
    viewState.datasource ? viewState.datasource.title : ''
  }'`;
}

export const config: DatasourcePlugin<VisModel> = {
  name: 'index_pattern',
  toExpression,
  DataPanel,
  icon: 'indexPatternApp',
};
