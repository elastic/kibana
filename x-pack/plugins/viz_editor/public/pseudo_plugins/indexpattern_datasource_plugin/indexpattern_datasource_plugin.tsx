/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBox } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
// import { IndexPattern } from 'ui/index_patterns';
import { FieldListPanel } from '../../common/components/field_list_panel';
import { Datasource, VisModel } from '../../common/lib';
import { DatasourcePlugin, PanelComponentProps } from '../../datasource_plugin_registry';
import { getIndexPatterns } from './index_patterns';

interface DataPanelState {
  indexPatterns: Datasource[];
  selectionTitle: string;
}

function getSelectedIndexPattern({
  indexPatterns,
  selectionTitle,
}: DataPanelState): Datasource | null {
  const selected = indexPatterns.find(({ title }) => title === selectionTitle);
  return selected || null;
}

function DataPanel(props: PanelComponentProps<VisModel>) {
  const { visModel, onChangeVisModel } = props;

  const [state, setState] = useState({
    indexPatterns: [],
    selectionTitle: '',
  } as DataPanelState);

  function updateSelection(newState: DataPanelState) {
    setState(newState);

    onChangeVisModel({
      ...visModel,
      datasource: getSelectedIndexPattern(newState),
    });
  }

  useEffect(() => {
    getIndexPatterns().then(loadedIndexPatterns => {
      if (!loadedIndexPatterns) {
        return;
      }

      updateSelection({
        indexPatterns: loadedIndexPatterns as Datasource[],
        selectionTitle: loadedIndexPatterns.length ? loadedIndexPatterns[0].title : '',
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
          ({ label }) => label === state.selectionTitle
        )}
        isClearable={false}
        onChange={([{ label }]) =>
          updateSelection({
            ...state,
            selectionTitle: label as string,
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
