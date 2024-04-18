/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function formatEsqlExamples(content: string) {
  // Regular expression to match the queries
  const queryRegex = /(\s*(FROM |ROW |SHOW ).*?)(?=\n[^|\s]|$)/gs;

  // Function to format a matched query
  const formatQuery = (match: string) => {
    return `\n\`\`\`esql\n${match.trim()}\n\`\`\`\n`;
  };

  // Replace all matches in the input string
  return content.replace(queryRegex, formatQuery);
}
