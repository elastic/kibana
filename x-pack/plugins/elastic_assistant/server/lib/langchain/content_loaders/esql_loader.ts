/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';

import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { join, resolve } from 'path';

import { ElasticsearchStore } from '../elasticsearch_store/elasticsearch_store';

/**
 * Loads the ESQL docs and language files into the Knowledge Base.
 *
 * *Item of Interest*
 * Knob #1: Types of documents loaded, metadata included, and document chunking strategies + text-splitting
 */
export const loadESQL = async (esStore: ElasticsearchStore, logger: Logger): Promise<boolean> => {
  try {
    const docsLoader = new DirectoryLoader(
      resolve(__dirname, '../../../knowledge_base/esql/docs'),
      {
        '.asciidoc': (path) => new TextLoader(path),
      },
      true
    );
    const joinPath = resolve(join(__dirname, filePath));
    const resolvePath = resolve(__dirname, '../../../knowledge_base/esql/language_definition');

    logger.info(`esql_loader joinPath\n${joinPath}`);
    logger.info(`esql_loader resolvePath\n${resolvePath}`);

    const languageLoader = new DirectoryLoader(
      resolve(__dirname, '../../../knowledge_base/esql/language_definition'),
      {
        '.g4': (path) => new TextLoader(path),
        '.tokens': (path) => new TextLoader(path),
      },
      true
    );

    const docs = await docsLoader.load();
    const languageDocs = await languageLoader.load();

    logger.info(
      `Loading ${docs.length} ESQL docs and ${languageDocs.length} language docs into the Knowledge Base`
    );

    const response = await esStore.addDocuments([...docs, ...languageDocs]);

    logger.info(
      `Loaded ${response?.length ?? 0} ESQL docs and language docs into the Knowledge Base`
    );

    return response.length > 0;
  } catch (e) {
    logger.error(
      `esql_loader Failed to load ES|QL docs, language docs, and example queries into the Knowledge Base \n${e}`
    );
    return false;
  }
};
