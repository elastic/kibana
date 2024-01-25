/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { fetchFieldsFromESQL } from '@kbn/text-based-editor';
import { DimensionTrigger } from '@kbn/visualization-ui-components';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { DatasourceDimensionTriggerProps } from '../../../types';
import type { TextBasedPrivateState } from '../types';
import {
  getColumnsFromCache,
  addColumnsToCache,
  retrieveLayerColumnsFromCache,
} from '../fieldlist_cache';

export type TextBasedDimensionTrigger = DatasourceDimensionTriggerProps<TextBasedPrivateState> & {
  columnLabelMap: Record<string, string>;
  expressions: ExpressionsStart;
};

export function TextBasedDimensionTrigger(props: TextBasedDimensionTrigger) {
  const [dataHasLoaded, setDataHasLoaded] = useState(false);
  const query = props.state.layers[props.layerId]?.query;
  useEffect(() => {
    // in case the columns are not in the cache, I refetch them
    async function fetchColumns() {
      const fieldList = query ? getColumnsFromCache(query) : [];

      if (fieldList.length === 0 && query) {
        const table = await fetchFieldsFromESQL(query, props.expressions);
        if (table) {
          addColumnsToCache(query, table.columns);
        }
      }
      setDataHasLoaded(true);
    }
    fetchColumns();
  }, [props.expressions, query]);
  const allColumns = dataHasLoaded
    ? retrieveLayerColumnsFromCache(props.state.layers[props.layerId]?.columns ?? [], query)
    : [];
  const selectedField = allColumns?.find((column) => column.columnId === props.columnId);
  let customLabel: string | undefined = props.columnLabelMap[props.columnId];
  if (!customLabel) {
    customLabel = selectedField?.fieldName;
  }
  return (
    <DimensionTrigger
      id={props.columnId}
      color={customLabel && selectedField ? 'primary' : 'danger'}
      dataTestSubj="lns-dimensionTrigger-textBased"
      label={
        customLabel ??
        i18n.translate('xpack.lens.textBasedLanguages.missingField', {
          defaultMessage: 'Missing field',
        })
      }
    />
  );
}
