/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { resolve } from 'path';
import { Document } from 'langchain/document';

import { Metadata } from '@kbn/elastic-assistant-common';
import { addRequiredKbResourceMetadata } from './add_required_kb_resource_metadata';
import { ESQL_RESOURCE } from '../../../routes/knowledge_base/constants';
import { AIAssistantKnowledgeBaseDataClient } from '../../../ai_assistant_data_clients/knowledge_base';

/**
 * Loads the ESQL docs and language files into the Knowledge Base.
 */
export const loadESQL = async (
  kbDataClient: AIAssistantKnowledgeBaseDataClient,
  logger: Logger
): Promise<boolean> => {
  try {
    const docsLoader = new DirectoryLoader(
      resolve(__dirname, '../../../knowledge_base/esql/documentation'),
      {
        '.asciidoc': (path) => new TextLoader(path),
      },
      true
    );

    const languageLoader = new DirectoryLoader(
      resolve(__dirname, '../../../knowledge_base/esql/language_definition'),
      {
        '.g4': (path) => new TextLoader(path),
        '.tokens': (path) => new TextLoader(path),
      },
      true
    );

    const exampleQueriesLoader = new DirectoryLoader(
      resolve(__dirname, '../../../knowledge_base/esql/example_queries'),
      {
        '.asciidoc': (path) => new TextLoader(path),
      },
      true
    );

    const docs = (await docsLoader.load()) as Array<Document<Metadata>>;
    const languageDocs = (await languageLoader.load()) as Array<Document<Metadata>>;
    const rawExampleQueries = await exampleQueriesLoader.load();

    // Add additional metadata to the example queries that indicates they are required KB documents:
    const requiredExampleQueries = addRequiredKbResourceMetadata({
      docs: rawExampleQueries,
      kbResource: ESQL_RESOURCE,
    }) as Array<Document<Metadata>>;

    // And make sure remaining docs have `kbResource:esql`
    const docsWithMetadata = addRequiredKbResourceMetadata({
      docs,
      kbResource: ESQL_RESOURCE,
      required: false,
    }) as Array<Document<Metadata>>;

    const languageDocsWithMetadata = addRequiredKbResourceMetadata({
      docs: languageDocs,
      kbResource: ESQL_RESOURCE,
      required: false,
    }) as Array<Document<Metadata>>;

    logger.info(
      `Loading ${docsWithMetadata.length} ES|QL docs, ${languageDocsWithMetadata.length} language docs, and ${requiredExampleQueries.length} example queries into the Knowledge Base`
    );

    const response = await kbDataClient.addKnowledgeBaseDocuments({
      documents: [...docsWithMetadata, ...languageDocsWithMetadata, ...requiredExampleQueries],
      global: true,
    });

    logger.info(
      `Loaded ${
        response?.length ?? 0
      } ES|QL docs, language docs, and example queries into the Knowledge Base`
    );

    return response.length > 0;
  } catch (e) {
    logger.error(
      `Failed to load ES|QL docs, language docs, and example queries into the Knowledge Base\n${e}`
    );
    return false;
  }
};
