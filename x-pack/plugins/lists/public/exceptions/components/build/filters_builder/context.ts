/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Dispatch } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';

import { Operator } from '../filter_bar/filter_editor/lib';

import type { FiltersBuilderActions } from './reducer';

interface FiltersBuilderContextType {
  operators: Operator[];
  dataView: DataView;
  dispatch: Dispatch<FiltersBuilderActions>;
  globalParams: {
    maxDepth: number;
    hideOr: boolean;
  };
  dropTarget: string;
  timeRangeForSuggestionsOverride?: boolean;
  filtersForSuggestions?: Filter[];
  disabled: boolean;
}

export const FiltersBuilderContextType = React.createContext<FiltersBuilderContextType>(
  {} as FiltersBuilderContextType
);
