/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiSuperSelect } from '@elastic/eui';
import zipObject from 'lodash-es/zipObject';
import React, { useEffect, useState } from 'react';
import { IndexPattern } from 'ui/index_patterns';
import { FieldListPanel } from '../public/common/components/field_list_panel';
import { VisModel } from '../public/common/lib';
import { DatasourcePlugin, PanelComponentProps } from '../public/datasource_plugin_registry';
import { getIndexPatterns } from './index_patterns';

function DataPanel({ visModel, onChangeVisModel }: PanelComponentProps<VisModel>) {
  const [indexPatterns, setIndexPatterns] = useState({} as { [id: string]: IndexPattern });
  const selectedIndexPattern = visModel.datasource;
  useEffect(() => {
    getIndexPatterns().then(loadedIndexPatterns => {
      if (!loadedIndexPatterns) {
        return;
      }

      setIndexPatterns(zipObject(loadedIndexPatterns.map(({ id }) => id), loadedIndexPatterns));
    });
  }, []);

  const indexPatternNames = Object.values(indexPatterns).map(({ id, title }) => ({
    text: title,
    value: id,
    inputDisplay: title,
  }));

  return (
    <>
      <EuiSuperSelect
        options={indexPatternNames}
        valueOfSelected={selectedIndexPattern ? selectedIndexPattern.id : ''}
        onChange={(value: string) => {
          onChangeVisModel({
            ...visModel,
            datasource: indexPatterns[value],
          });
        }}
      />
      <FieldListPanel datasource={visModel.datasource} />
    </>
  );
}

function toExpression(viewState: VisModel) {
  // TODO prob. do this on an AST object and stringify afterwards
  return `sample_data`;
  // return `our_fancy_query_function args='${JSON.stringify(viewState.queries)}'`;
}

export const config: DatasourcePlugin<VisModel> = {
  name: 'index_pattern',
  toExpression,
  DataPanel,
  icon: 'indexPatternApp',
};
