/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Fs from 'fs';
import Path from 'path';
import { promisify } from 'util';

import { Logger } from '@kbn/logging';
import type { ObservabilityAIAssistantService } from '../..';

const readdir = promisify(Fs.readdir);
const readFile = promisify(Fs.readFile);

export async function addEsqlDocsToKb({
  service,
  logger,
}: {
  service: ObservabilityAIAssistantService;
  logger: Logger;
}) {
  try {
    const texts: Array<{ id: string; text: string }> = [];
    const folderName = Path.join(__dirname, './assets/esql');
    for (const fileName of await readdir(folderName)) {
      if (fileName.endsWith('.txt')) {
        const fileContents = await readFile(Path.join(folderName, fileName), 'utf-8');
        texts.push({ id: Path.basename(fileName), text: fileContents });
      }
    }

    service.addCategoryToKnowledgeBase('es_ql', texts);
  } catch (error) {
    logger.error('Failed to index ES|QL files');
    logger.error(error);
  }
}
