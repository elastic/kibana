/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiSuperSelect } from '@elastic/eui';
import zipObject from 'lodash-es/zipObject';
import React, { useEffect } from 'react';
import { FieldListPanel } from '../public/common/components/field_list_panel';
import { VisModel } from '../public/common/lib';
import { DatasourcePlugin, PanelComponentProps } from '../public/datasource_plugin_registry';
import { getIndexPatterns } from './index_patterns';

type IndexPatternVisModel = VisModel<'indexPattern', {}>;

function dataPanel({ visModel, onChangeVisModel }: PanelComponentProps<IndexPatternVisModel>) {
  const indexPatterns = visModel.datasources;
  useEffect(
    () => {
      if (indexPatterns) {
        return;
      }

      getIndexPatterns().then(loadedIndexPatterns => {
        if (!loadedIndexPatterns) {
          return;
        }

        onChangeVisModel({
          ...visModel,
          datasources: zipObject(loadedIndexPatterns.map(({ id }) => id), loadedIndexPatterns),
        });
      });
    },
    [indexPatterns]
  );

  return (
    <>
      <FieldListPanel datasources={visModel.datasources} />
    </>
  );
}

function toExpression(viewState: IndexPatternVisModel) {
  // TODO prob. do this on an AST object and stringify afterwards
  return `sample_data`;
  // return `our_fancy_query_function args='${JSON.stringify(viewState.queries)}'`;
}

export const config: DatasourcePlugin<IndexPatternVisModel> = {
  name: 'index_pattern',
  toExpression,
  DataPanel: dataPanel,
};
