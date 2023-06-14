/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  getFileDataChunkDataStreamIndexTemplate,
  getFileMetaDataStreamIndexTemplate,
} from './templates';

export const installDataStreams = async (esClient: Client, log: ToolingLog) => {
  // Install file meta index template
  const { name: metaIndexName, template: metaIndexTemplate } = getFileMetaDataStreamIndexTemplate();
  const metaIndexTemplateInstallResponse = await esClient.indices.putIndexTemplate({
    name: metaIndexName,
    body: metaIndexTemplate,
  });

  log.info(`index template [${metaIndexName}] for file metadata created!`);
  log.verbose(metaIndexTemplateInstallResponse);

  // Install file data index template
  const { name: dataIndexName, template: dataIndexTemplate } =
    getFileDataChunkDataStreamIndexTemplate();
  const dataIndexTemplateInstallResponse = await esClient.indices.putIndexTemplate({
    name: dataIndexName,
    body: dataIndexTemplate,
  });

  log.info(`index template [${dataIndexName}] for file chunks created!`);
  log.verbose(dataIndexTemplateInstallResponse);
};
