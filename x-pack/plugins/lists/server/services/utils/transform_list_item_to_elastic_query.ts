/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsDataTypeUnion, Type, esDataTypeUnion } from '../../../common/schemas';
import { ErrorWithStatusCode } from '../../error_with_status_code';

export const transformListItemToElasticQuery = ({
  type,
  value,
}: {
  type: Type;
  value: string;
}): EsDataTypeUnion => {
  const unionType = { [type]: value };
  if (esDataTypeUnion.is(unionType)) {
    return unionType;
  } else {
    throw new ErrorWithStatusCode(
      `Unknown list item to transform to elastic query, type: ${type}, value: ${value}`,
      400
    );
  }
};
