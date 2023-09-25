/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getCategoryQuery({ contexts }: { contexts?: string[] }) {
  const noCategoryFilter = {
    bool: {
      must_not: {
        exists: {
          field: 'labels.category',
        },
      },
    },
  };

  if (!contexts) {
    return [noCategoryFilter];
  }

  return [
    {
      bool: {
        should: [
          noCategoryFilter,
          {
            terms: {
              'labels.category': contexts,
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
  ];
}
