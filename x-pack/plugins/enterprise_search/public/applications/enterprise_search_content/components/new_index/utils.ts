/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIVERSAL_LANGUAGE_VALUE } from './constants';
import { LanguageForOptimization } from './types';

// Enterprise Search expects the Universal language option to be represented by null
// but we can't use null as the value for an EuiSelectOption
export const getLanguageForOptimization = (language: string): LanguageForOptimization =>
  language === UNIVERSAL_LANGUAGE_VALUE ? null : language;
