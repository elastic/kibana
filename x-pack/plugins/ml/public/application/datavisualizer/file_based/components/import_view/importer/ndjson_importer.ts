/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Importer, ImportConfig } from './importer';
import { FindFileStructureResponse } from '../../../../../../../common/types/file_datavisualizer';

export class NdjsonImporter extends Importer {
  constructor(results: FindFileStructureResponse, settings: ImportConfig) {
    super(settings);
  }

  read(json: string) {
    try {
      const splitJson = json.split(/}\s*\n/);

      const ndjson: any[] = [];
      for (let i = 0; i < splitJson.length; i++) {
        if (splitJson[i] !== '') {
          // note the extra } at the end of the line, adding back
          // the one that was eaten in the split
          ndjson.push(`${splitJson[i]}}`);
        }
      }

      this._docArray = ndjson;

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error,
      };
    }
  }
}
