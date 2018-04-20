/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { print } from './print';
import { preserveLayout } from './preserve_layout';
import { LayoutTypes } from '../../common/constants';

export function getLayout(name) {
  switch (name) {
    case LayoutTypes.PRINT:
      return print;
    case LayoutTypes.PRESERVE_LAYOUT:
      return preserveLayout;
    default:
      throw new Error(`Unexpected layout of ${name}`);
  }
}