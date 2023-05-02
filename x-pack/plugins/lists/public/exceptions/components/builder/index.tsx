/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import React, { Suspense, lazy } from 'react';

import {
  FilterEditor,
  Operator,
  doesNotExistOperator,
  existsOperator,
  isNotOneOfOperator,
  isNotOperator,
  isNotWildcardOperator,
  isOneOfOperator,
  isOperator,
  isWildcardOperator,
} from '../build/filter_bar/filter_editor';

// Note: Only use import type/export type here to avoid pulling anything non-lazy into the main plugin and increasing the plugin size
import type { ExceptionBuilderProps } from './exception_items_renderer';
export type { OnChangeProps } from './exception_items_renderer';

export interface ExceptionBuilderProps {
  operators: Operator[];
  filter: Filter;
  onLocalFilterUpdate: ((filter: Filter | QueryDslFilter) => void) | undefined;
}

// {
//   meta: {
//     disabled: false,
//     negate: false,
//     alias: null,
//     key: 'agent.name',
//     field: 'agent.name',
//     params: {},
//   },
//   $state: {
//     store: 'appState',
//   },
// }
/**
 * This lazy load allows the exception builder to pull everything out into a plugin chunk.
 * You want to be careful of not directly importing/exporting things from exception_items_renderer
 * unless you use a import type, and/or a export type to ensure full type erasure
 */
export const getExceptionBuilderComponentLazy = ({
  operators,
  filter,
  onLocalFilterUpdate,
  indexPatterns,
}: ExceptionBuilderProps): JSX.Element => {
  console.log({ IP: indexPatterns });
  return (
    <FilterEditor
      operators={operators}
      filter={filter}
      indexPatterns={indexPatterns}
      onLocalFilterUpdate={onLocalFilterUpdate}
      onLocalFilterCreate={() => {}}
    />
  );
};
