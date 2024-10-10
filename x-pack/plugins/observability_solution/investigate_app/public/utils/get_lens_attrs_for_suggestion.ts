/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { Suggestion, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import { mapValues } from 'lodash';
import { v4 } from 'uuid';

export function getLensAttrsForSuggestion({
  query,
  suggestion,
  dataView,
  table,
}: {
  query: string;
  suggestion: Suggestion;
  dataView: DataView;
  table?: Datatable;
}): TypedLensByValueInput {
  const attrs = getLensAttributesFromSuggestion({
    filters: [],
    query: {
      esql: query,
    },
    suggestion,
    dataView,
  }) as TypedLensByValueInput['attributes'];

  const lensEmbeddableInput: TypedLensByValueInput = {
    attributes: attrs,
    id: v4(),
  };

  if (!table) {
    return lensEmbeddableInput;
  }

  const textBased = attrs.state.datasourceStates.textBased;

  if (!textBased?.layers) {
    throw new Error('Expected layers to exist for datasourceStates.textBased');
  }

  textBased.layers = mapValues(textBased.layers, (value) => {
    return { ...value, table };
  });

  return lensEmbeddableInput;
}
