/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type, EsDataTypeUnion } from '../../../common/schemas';

export const transformListItemsToElasticQuery = ({
  type,
  value,
}: {
  type: Type;
  value: string;
  // We disable the consistent return since we want to use typescript for exhaustive type checks
  // eslint-disable-next-line consistent-return
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
};
