/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from 'gpt-tokenizer';
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
  async ({ searchTerm, connectorId, products, functionCalling, max = 3 }) => {
    const searchResults = await searchDocAPI({ query: searchTerm, products, max });

    console.log('*** retrieveDocumentation => found ' + searchResults.results.length);

    const processedDocuments = await Promise.all(
      searchResults.results.map(async (document) => {
        const tokenCount = countTokens(document.content);

        let chunks: string[];
        if (tokenCount > 250) {
          const extractResponse = await extractRelevantChunks({
            searchTerm,
            documentContent: document.content,
            outputAPI,
            connectorId,
            functionCalling,
          });
          chunks = extractResponse.chunks;
        } else {
          chunks = [document.content];
        }

        return {
          title: document.title,
          url: document.url,
          chunks,
        };
      })
    );

    console.log(`retrieved documents: ${processedDocuments.map((doc) => doc.title)}`);

    return {
      documents: processedDocuments.filter((doc) => doc.chunks.length > 0),
    };
  };

const countTokens = (text: string): number => {
  return encode(text).length;
};
