/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageImporter } from '@kbn/file-upload-plugin/public';
import type { HttpSetup } from '@kbn/core/public';
import type { ImportFactoryOptions } from '@kbn/file-upload-plugin/public/importer';
import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import type { TestGrokPatternResponse } from '../../../../../common/types/test_grok_pattern';

export const LINE_LIMIT = 5;

type HighlightedLine = Array<{
  word: string;
  field?: {
    type: string;
    name: string;
  };
}>;

export class GrokHighlighter extends MessageImporter {
  constructor(options: ImportFactoryOptions, private http: HttpSetup) {
    super(options);
  }

  public async createLines(
    text: string,
    grokPattern: string,
    mappings: FindFileStructureResponse['mappings'],
    ecsCompatibility: string | undefined
  ): Promise<HighlightedLine[]> {
    const docs = this._createDocs(text, false, LINE_LIMIT);
    const lines = docs.docs.map((doc) => doc.message);
    const matches = await this.testGrokPattern(lines, grokPattern, ecsCompatibility);

    return lines.map((line, index) => {
      const { matched, fields } = matches[index];
      if (matched === false) {
        return [
          {
            word: line,
          },
        ];
      }
      const sortedFields = Object.entries(fields)
        .map(([fieldName, [{ match, offset, length }]]) => {
          let type = mappings.properties[fieldName]?.type;
          if (type === undefined && fieldName === 'timestamp') {
            // it's possible that the timestamp field is not mapped as `timestamp`
            // but instead as `@timestamp`
            type = mappings.properties['@timestamp']?.type;
          }
          return {
            name: fieldName,
            match,
            offset,
            length,
            type,
          };
        })
        .sort((a, b) => a.offset - b.offset);

      let offset = 0;
      const highlightedLine: HighlightedLine = [];
      for (const field of sortedFields) {
        highlightedLine.push({ word: line.substring(offset, field.offset) });
        highlightedLine.push({
          word: field.match,
          field: {
            type: field.type,
            name: field.name,
          },
        });
        offset = field.offset + field.length;
      }
      highlightedLine.push({ word: line.substring(offset) });
      return highlightedLine;
    });
  }

  private async testGrokPattern(
    lines: string[],
    grokPattern: string,
    ecsCompatibility: string | undefined
  ) {
    const { matches } = await this.http.fetch<TestGrokPatternResponse>(
      '/internal/data_visualizer/test_grok_pattern',
      {
        method: 'POST',
        version: '1',
        body: JSON.stringify({
          grokPattern,
          text: lines,
          ecsCompatibility,
        }),
      }
    );
    return matches;
  }
}
