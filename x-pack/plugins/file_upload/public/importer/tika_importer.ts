/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromByteArray } from 'base64-js';
import { ImportDocTika } from '../../common/types';
import { Importer } from './importer';
import { CreateDocsResponse } from './types';

export class TikaImporter extends Importer {
  constructor() {
    super();
  }

  public read(data: ArrayBuffer) {
    this._chunkSize = 0;
    const pdfBase64 = fromByteArray(new Uint8Array(data));
    const { success, docs } = this._createDocs(pdfBase64);
    if (success) {
      this._docArray = this._docArray.concat(docs);
    } else {
      return { success: false };
    }
    return { success: true };
  }

  protected _createDocs(base64String: string): CreateDocsResponse<ImportDocTika> {
    const remainder = 0;
    try {
      const docs = [{ data: base64String }];
      return {
        success: true,
        docs,
        remainder,
      };
    } catch (error) {
      return {
        success: false,
        docs: [],
        remainder,
        error,
      };
    }
  }
}
