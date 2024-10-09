/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OutputAPI } from '@kbn/inference-plugin/common/output';
import type { ProductDocSearchAPI } from '@kbn/product-doc-base-plugin/server';
import type { RetrieveDocumentationAPI } from './types';
import { extractRelevantChunks } from './extract_relevant_chunks';

export const retrieveDocumentation =
  ({
    outputAPI,
    searchDocAPI,
  }: {
    outputAPI: OutputAPI;
    searchDocAPI: ProductDocSearchAPI;
  }): RetrieveDocumentationAPI =>
  async ({ searchTerm, connectorId, functionCalling }) => {
    const searchResults = await searchDocAPI({ query: searchTerm, max: 3 });

    const processedDocuments = await Promise.all(
      searchResults.results.map(async (document) => {
        const { chunks } = await extractRelevantChunks({
          searchTerm,
          documentContent: document.content,
          outputAPI,
          connectorId,
          functionCalling,
        });

        return {
          title: document.title,
          url: document.url,
          chunks,
        };
      })
    );

    return {
      documents: processedDocuments.filter((doc) => doc.chunks.length > 0),
    };
  };
