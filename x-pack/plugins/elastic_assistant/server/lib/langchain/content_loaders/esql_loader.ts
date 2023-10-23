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

import { ElasticsearchStore } from '../elasticsearch_store/elasticsearch_store';
import { addRequiredKbResourceMetadata } from './add_required_kb_resource_metadata';
import { ESQL_RESOURCE } from '../../../routes/knowledge_base/constants';

/**
 * Loads the ESQL docs and language files into the Knowledge Base.
 *
 * *Item of Interest*
 * Knob #1: Types of documents loaded, metadata included, and document chunking strategies + text-splitting
 */
export const loadESQL = async (esStore: ElasticsearchStore, logger: Logger): Promise<boolean> => {
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

    const docs = await docsLoader.load();
    const languageDocs = await languageLoader.load();
    const rawExampleQueries = await exampleQueriesLoader.load();

    // Add additional metadata to the example queries that indicates they are required KB documents:
    const requiredExampleQueries = addRequiredKbResourceMetadata({
      docs: rawExampleQueries,
      kbResource: ESQL_RESOURCE,
    });

    logger.info(
      `Loading ${docs.length} ES|QL docs, ${languageDocs.length} language docs, and ${requiredExampleQueries.length} example queries into the Knowledge Base`
    );

    const response = await esStore.addDocuments([
      ...docs,
      ...languageDocs,
      ...requiredExampleQueries,
    ]);

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
