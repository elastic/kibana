/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchEsListItemSchema, Type } from '../../../common/schemas';
import { ErrorWithStatusCode } from '../../error_with_status_code';

interface DeriveTypeFromItemOptions {
  item: SearchEsListItemSchema;
}

export const deriveTypeFromItem = ({ item }: DeriveTypeFromItemOptions): Type => {
  if (item.ip != null) {
    return 'ip';
  } else if (item.keyword != null) {
    return 'keyword';
  } else {
    throw new ErrorWithStatusCode(
      `Was expecting a valid type from the Elastic Search List Item such as ip or keyword but did not found one here ${JSON.stringify(
        item
      )}`,
      400
    );
  }
};
