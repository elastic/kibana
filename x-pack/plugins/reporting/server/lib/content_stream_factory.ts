/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportingCore } from '..';
import { ContentStream, ContentStreamDocument } from './content_stream';

export function getContentStreamFactory(reporting: ReportingCore) {
  async function getClient() {
    const { asInternalUser: client } = await reporting.getEsClient();

    return client;
  }

  return async function getContentStream(document: ContentStreamDocument) {
    return new ContentStream(await getClient(), document);
  };
}
