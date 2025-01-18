/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// field/value pairs should match, or the field should not exist
export function getShouldMatchOrNotExistFilter(
  keyValuePairs: Array<{
    field: string;
    value?: string;
  }>
) {
  return keyValuePairs
    .filter(({ value }) => value)
    .map(({ field, value }) => {
      return {
        bool: {
          should: [
            {
              bool: {
                filter: [{ term: { [field]: value } }],
              },
            },
            {
              bool: {
                must_not: {
                  bool: {
                    filter: [{ exists: { field } }],
                  },
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      };
    });
}
