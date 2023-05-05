/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentStream } from '@kbn/reporting-plugin/server/lib';
import { ReportingExportTypesCore } from '../../core';

type ContentStreamEncoding = 'base64' | 'raw';

interface ContentStreamDocument {
  id: string;
  index: string;
  if_primary_term?: number;
  if_seq_no?: number;
}
interface ContentStreamParameters {
  /**
   * Content encoding. By default, it is Base64.
   */
  encoding?: ContentStreamEncoding;
}

export async function getContentStream(
  reporting: ReportingExportTypesCore,
  document: ContentStreamDocument,
  parameters?: ContentStreamParameters
) {
  const { asInternalUser: client } = await reporting.getEsClient();
  const { logger } = reporting.getPluginSetupDeps();

  return new ContentStream(
    client,
    logger.get('content_stream').get(document.id),
    document,
    parameters
  );
}
