/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsDataTypeUnion, Type } from '../../../common/schemas';

export const transformListItemToElasticQuery = ({
  type,
  value,
}: {
  type: Type;
  value: string;
}): EsDataTypeUnion => {
  switch (type) {
    case 'ip': {
      return {
        ip: value,
      };
    }
    case 'keyword': {
      return {
        keyword: value,
      };
    }
  }
  return assertUnreachable(type);
};

const assertUnreachable = (type: string): never => {
  throw new Error(`Unknown type: "${type}" in transformListItemToElasticQuery`);
};
