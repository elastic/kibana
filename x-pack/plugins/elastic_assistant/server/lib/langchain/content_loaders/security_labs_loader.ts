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
import { SECURITY_LABS_RESOURCE } from '../../../routes/knowledge_base/constants';
import { AIAssistantKnowledgeBaseDataClient } from '../../../ai_assistant_data_clients/knowledge_base';

/**
 * Loads the Elastic Security Labs mdx files into the Knowledge Base.
 */
export const loadSecurityLabs = async (
  kbDataClient: AIAssistantKnowledgeBaseDataClient,
  logger: Logger
): Promise<boolean> => {
  try {
    const docsLoader = new DirectoryLoader(
      resolve(__dirname, '../../../knowledge_base/security_labs'),
      {
        '.md': (path) => new TextLoader(path),
      },
      true
    );

    const rawDocs = await docsLoader.load();
    // Add additional metadata to set kbResource as esql
    const docs = addRequiredKbResourceMetadata({
      docs: rawDocs,
      kbResource: SECURITY_LABS_RESOURCE,
      required: false,
    }) as Array<Document<Metadata>>;

    logger.info(`Loading ${docs.length} Security Labs docs into the Knowledge Base`);

    const response = await kbDataClient.addKnowledgeBaseDocuments({
      documents: docs,
      global: true,
    });

    logger.info(`Loaded ${response?.length ?? 0} Security Labs docs into the Knowledge Base`);

    return response.length > 0;
  } catch (e) {
    logger.error(`Failed to load Security Labs docs into the Knowledge Base\n${e}`);
    return false;
  }
};
