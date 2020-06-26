/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EsDataTypeUnion,
  SerializerOrUndefined,
  Type,
  esDataTypeUnion,
} from '../../../common/schemas';
import { ErrorWithStatusCode } from '../../error_with_status_code';

export const transformListItemToElasticQuery = ({
  serializer,
  type,
  value,
}: {
  type: Type;
  value: string;
  serializer: SerializerOrUndefined;
}): EsDataTypeUnion => {
  switch (type) {
    case 'date_range': {
      const regExp = serializer != null ? RegExp(serializer) : RegExp('(?<gte>.+),(?<lte>.+)');
      const parsed = regExp.exec(value);
      if (parsed?.groups?.lte != null && parsed?.groups?.gte) {
        return { date_range: { gte: parsed.groups.gte, lte: parsed.groups.lte } };
      } else {
        // TODO: Return null or write these to a new index that represents error conditions
        throw new ErrorWithStatusCode(
          `Unknown list item to transform to elastic query, type: ${type}, value: ${value}`,
          400
        );
      }
    }
    default: {
      // TODO: Add the ability to search for the regex of '(?<value>)'
      const unionType = { [type]: value };
      if (esDataTypeUnion.is(unionType)) {
        return unionType;
      } else {
        throw new ErrorWithStatusCode(
          `Unknown list item to transform to elastic query, type: ${type}, value: ${value}`,
          400
        );
      }
    }
  }
};
