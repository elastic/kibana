/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function createDuplicateContextQuery(index, { id, urlContext }) {
  let mustNotClause = {};

  if (id) {
    mustNotClause = {
      must_not: {
        term: {
          '_id': `space:${id}`
        }
      }
    };
  }

  return {
    index,
    ignore: [404],
    body: {
      query: {
        bool: {
          must: {
            term: {
              [`space.urlContext`]: urlContext
            }
          },
          ...mustNotClause
        }
      }
    }
  };
}
