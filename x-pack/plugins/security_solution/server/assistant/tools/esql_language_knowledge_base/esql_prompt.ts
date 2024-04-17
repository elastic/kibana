/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getEsqlPrompt = (xxx: string) => `
${xxx}

Only return valid ES|QL queries as described above. Do not add any additional text to describe your output. ES|QL query output should be on one line. Escape any special characters in the output for use within JSON. Escape backslashes to respect JSON validation. New lines must always be escaped with double backslashes, i.e. \\\\n to ensure valid JSON.
 `;
