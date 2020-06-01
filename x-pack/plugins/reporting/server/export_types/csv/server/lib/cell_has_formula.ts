/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { startsWith } from 'lodash';
import { CSV_FORMULA_CHARS } from '../../../../../common/constants';

export const cellHasFormulas = (val: string) =>
  CSV_FORMULA_CHARS.some((formulaChar) => startsWith(val, formulaChar));
