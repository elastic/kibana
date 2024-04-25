/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Document } from '@langchain/core/documents';

export function getCitations(
  answer: string,
  citationStyle: 'inline' | 'footnote',
  docs: Document[]
) {
  const gatheredCitations = answer.match(/\[\d+\]/g);
  if (!gatheredCitations) return [];

  return docs.filter((doc, i) => {
    return gatheredCitations.some((citation) => {
      return i + 1 === parseInt(citation.slice(1, -1), 10);
    });
  });
}
