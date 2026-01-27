/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { ErrorMark } from '@kbn/apm-ui-shared';
import type { IWaterfallError } from '../waterfall/waterfall_helpers/waterfall_helpers';

export const getErrorMarks = (
  errorItems: IWaterfallError[],
  errorLinksMap: Map<string, string>
): ErrorMark[] => {
  if (isEmpty(errorItems)) {
    return [];
  }

  return errorItems.map((error) => ({
    type: 'errorMark',
    offset: Math.max(error.offset + error.skew, 0),
    verticalLine: false,
    id: error.id,
    error: error.doc,
    serviceColor: error.color,
    href: errorLinksMap.get(error.id),
  }));
};
