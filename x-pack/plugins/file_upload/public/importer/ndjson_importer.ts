/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Importer } from './importer';
import { CreateDocsResponse } from './types';

export class NdjsonImporter extends Importer {
  constructor() {
    super();
  }

  protected _createDocs(json: string, isLastPart: boolean): CreateDocsResponse<string> {
    let remainder = 0;
    try {
      const splitJson = json.split(/}\s*\n/);
      const incompleteLastLine = json.match(/}\s*\n?$/) === null;

      const docs: string[] = [];
      if (splitJson.length) {
        for (let i = 0; i < splitJson.length - 1; i++) {
          if (splitJson[i] !== '') {
            // note the extra } at the end of the line, adding back
            // the one that was eaten in the split
            docs.push(`${splitJson[i]}}`);
          }
        }

        const lastDoc = splitJson[splitJson.length - 1];
        if (lastDoc) {
          if (incompleteLastLine === true) {
            remainder = lastDoc.length;
          } else {
            docs.push(`${lastDoc}}`);
          }
        }
      }

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
