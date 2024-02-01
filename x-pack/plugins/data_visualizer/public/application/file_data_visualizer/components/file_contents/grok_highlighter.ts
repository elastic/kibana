/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageImporter } from '@kbn/file-upload-plugin/public';

const LINE_LIMIT = 5;

export class GrokHighlighter extends MessageImporter {
  public async createLines(text: string) {
    const docs = this._createDocs(text, false, LINE_LIMIT);
    return docs.docs.map((doc) => doc.message);
  }
}
