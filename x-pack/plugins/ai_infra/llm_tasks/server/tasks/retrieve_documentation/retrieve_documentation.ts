/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { OutputAPI } from '@kbn/inference-common';
import type { ProductDocSearchAPI } from '@kbn/product-doc-base-plugin/server';
import { truncate, count as countTokens } from '../../utils/tokens';
import type { RetrieveDocumentationAPI } from './types';
import { summarizeDocument } from './summarize_document';

const MAX_DOCUMENTS_DEFAULT = 3;
const MAX_TOKENS_DEFAULT = 1000;

export const retrieveDocumentation =
  ({
    outputAPI,
    searchDocAPI,
    logger: log,
  }: {
    outputAPI: OutputAPI;
    searchDocAPI: ProductDocSearchAPI;
    logger: Logger;
  }): RetrieveDocumentationAPI =>
  async ({
    searchTerm,
    connectorId,
    products,
    functionCalling,
    max = MAX_DOCUMENTS_DEFAULT,
    maxDocumentTokens = MAX_TOKENS_DEFAULT,
    tokenReductionStrategy = 'summarize',
  }) => {
    try {
      const { results } = await searchDocAPI({ query: searchTerm, products, max });

      log.debug(`searching with term=[${searchTerm}] returned ${results.length} documents`);

      const processedDocuments = await Promise.all(
        results.map(async (document) => {
          const tokenCount = countTokens(document.content);
          const docHasTooManyTokens = tokenCount >= maxDocumentTokens;
          log.debug(
            `processing doc [${document.url}] - tokens : [${tokenCount}] - tooManyTokens: [${docHasTooManyTokens}]`
          );

          let content = document.content;
          if (docHasTooManyTokens) {
            if (tokenReductionStrategy === 'summarize') {
              const extractResponse = await summarizeDocument({
                searchTerm,
                documentContent: document.content,
                outputAPI,
                connectorId,
                functionCalling,
              });
              content = truncate(extractResponse.summary, maxDocumentTokens);
            } else {
              content = truncate(document.content, maxDocumentTokens);
            }
          }

          log.debug(`done processing document [${document.url}]`);
          return {
            title: document.title,
            url: document.url,
            content,
          };
        })
      );

      log.debug(() => {
        const docsAsJson = JSON.stringify(processedDocuments);
        return `searching with term=[${searchTerm}] - results: ${docsAsJson}`;
      });

      return {
        success: true,
        documents: processedDocuments.filter((doc) => doc.content.length > 0),
      };
    } catch (e) {
      log.error(`Error retrieving documentation: ${e.message}. Returning empty results.`);
      return { success: false, documents: [] };
    }
  };
