/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { IdentityField } from '../../entities';

export function entityTypeExistsQuery({
  identityFields,
}: {
  identityFields: IdentityField[];
}): QueryDslQueryContainer[] {
  return [
    {
      bool: {
        filter: [
          ...identityFields.flatMap(({ optional, field }) => {
            return optional
              ? []
              : [
                  {
                    exists: {
                      field,
                    },
                  },
                ];
          }),
        ],
      },
    },
  ];
}
