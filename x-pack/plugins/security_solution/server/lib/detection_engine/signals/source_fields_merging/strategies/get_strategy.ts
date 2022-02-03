/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertUnreachable } from '../../../../../../common/utility_types';
import type { ConfigType } from '../../../../../config';
import { MergeStrategyFunction } from '../types';
import { mergeAllFieldsWithSource } from './merge_all_fields_with_source';
import { mergeMissingFieldsWithSource } from './merge_missing_fields_with_source';
import { mergeNoFields } from './merge_no_fields';

export const getMergeStrategy = (
  mergeStrategy: ConfigType['alertMergeStrategy']
): MergeStrategyFunction => {
  switch (mergeStrategy) {
    case 'allFields': {
      return mergeAllFieldsWithSource;
    }
    case 'missingFields': {
      return mergeMissingFieldsWithSource;
    }
    case 'noFields': {
      return mergeNoFields;
    }
    default:
      return assertUnreachable(mergeStrategy);
  }
};
