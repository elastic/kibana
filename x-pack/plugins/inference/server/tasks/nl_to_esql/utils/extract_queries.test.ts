/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractQueries } from './extract_queries';

describe('extractQueries', () => {
  it('finds a single query', () => {
    const input = `
    Some text

    \`\`\`esql
    FROM my-index
    | WHERE foo == bar
    | SORT foo
    \`\`\`
    `;

    const queries = extractQueries(input);

    expect(queries).toEqual([
      {
        query: `FROM my-index
    | WHERE foo == bar
    | SORT foo`,
        startPos: 20,
        endPos: 91,
      },
    ]);
  });

  it('finds multiple queries', () => {
    const input = `
    Some text

    \`\`\`esql
    FROM my-index
    | WHERE foo == bar
    | SORT foo
    \`\`\`

    Another block of text

    \`\`\`esql
    FROM kibana_sample_data_logs
    | WHERE @timestamp > NOW() - 10 days
    | STATS volume = COUNT(*) BY BUCKET(@timestamp, 1 day)
    \`\`\`

    Some final block of text
    `;

    const queries = extractQueries(input);

    expect(queries).toEqual([
      {
        query: `FROM my-index
    | WHERE foo == bar
    | SORT foo`,
        startPos: 20,
        endPos: 91,
      },
      {
        query: `FROM kibana_sample_data_logs
    | WHERE @timestamp > NOW() - 10 days
    | STATS volume = COUNT(*) BY BUCKET(@timestamp, 1 day)`,
        startPos: 124,
        endPos: 272,
      },
    ]);
  });
});
