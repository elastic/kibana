/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KBN_FIELD_TYPES } from '../../../../../../../../../../src/plugins/data/public';

import { EsFieldName } from '../../../../../../../common/types/fields';

import { PivotAggsConfigDict, PivotGroupByConfigDict } from '../../../../../common';
import { SavedSearchQuery } from '../../../../../hooks/use_search_items';

import { QUERY_LANGUAGE } from './constants';

export interface ErrorMessage {
  query: string;
  message: string;
}

export interface Field {
  name: EsFieldName;
  type: KBN_FIELD_TYPES;
}

export interface StepDefineExposedState {
  aggList: PivotAggsConfigDict;
  groupByList: PivotGroupByConfigDict;
  isAdvancedPivotEditorEnabled: boolean;
  isAdvancedSourceEditorEnabled: boolean;
  searchLanguage: QUERY_LANGUAGE;
  searchString: string | undefined;
  searchQuery: string | SavedSearchQuery;
  sourceConfigUpdated: boolean;
  valid: boolean;
}
