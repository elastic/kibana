/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraFilter, InfraFilterType } from '../../../../../common/types';
import { InfraESQuery } from '../../../infra_types';

export function convertInputFilterToESQuery(filter: InfraFilter): InfraESQuery {
  if (filter.type === InfraFilterType.exists) {
    return {
      exists: {
        field: filter.value,
      },
    };
  }
  if (filter.type === InfraFilterType.query_string) {
    return {
      query_string: {
        analyze_wildcard: true,
        query: filter.value,
      },
    };
  }
  if (filter.type === InfraFilterType.match && filter.field) {
    return {
      match: {
        [filter.field]: {
          query: filter.value,
        },
      },
    };
  }

  throw new Error('You must supply a valid InfraFilterType');
}
