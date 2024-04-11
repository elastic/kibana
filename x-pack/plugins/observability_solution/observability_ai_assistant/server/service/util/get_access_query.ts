/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export function getAccessQuery({
  user,
  namespace,
}: {
  user?: { name: string; id?: string };
  namespace?: string;
}) {
  const visibilityConditions: Array<
    { term: { public: boolean } } | { term: { 'user.name': string } }
  > = [
    {
      term: {
        public: true,
      },
    },
  ];

  if (user) {
    visibilityConditions.push({
      term: {
        'user.name': user.name,
      },
    });
  }

  return [
    {
      bool: {
        filter: [
          {
            bool: {
              should: visibilityConditions,
              minimum_should_match: 1,
            },
          },
          {
            bool: {
              should: [
                {
                  term: {
                    namespace,
                  },
                },
                {
                  bool: {
                    must_not: {
                      exists: {
                        field: 'namespace',
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ];
}
