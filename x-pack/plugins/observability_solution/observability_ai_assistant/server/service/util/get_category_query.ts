/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getCategoryQuery({ categories }: { categories?: string[] }) {
  const noCategoryFilter = {
    bool: {
      must_not: {
        exists: {
          field: 'labels.category.keyword',
        },
      },
    },
  };

  if (!categories) {
    return [noCategoryFilter];
  }

  return [
    {
      bool: {
        should: [
          noCategoryFilter,
          {
            terms: {
              'labels.category.keyword': categories,
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
  ];
}
