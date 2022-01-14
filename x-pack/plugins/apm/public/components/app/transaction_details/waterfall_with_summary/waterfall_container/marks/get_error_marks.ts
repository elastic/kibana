/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { ErrorRaw } from '../../../../../../../typings/es_schemas/raw/error_raw';
import { IWaterfallError } from '../waterfall/waterfall_helpers/waterfall_helpers';
import { Mark } from '.';

export interface ErrorMark extends Mark {
  type: 'errorMark';
  error: ErrorRaw;
  serviceColor: string;
}

export const getErrorMarks = (errorItems: IWaterfallError[]): ErrorMark[] => {
  if (isEmpty(errorItems)) {
    return [];
  }

  return errorItems.map((error) => ({
    type: 'errorMark',
    offset: Math.max(error.offset + error.skew, 0),
    verticalLine: false,
    id: error.doc.error.id,
    error: error.doc,
    serviceColor: error.color,
  }));
};
