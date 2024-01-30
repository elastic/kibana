/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HttpSetup } from '@kbn/core/public';
import { EuiText } from '@elastic/eui';
import { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import { FieldBadge } from './field_badge';
import { getSupportedFieldType } from '../../../common/components/fields_stats_grid/get_field_names';

export interface CreateDocsResponse {
  success: boolean;
  remainder: number;
  docs: ImportDocMessage[];
  error?: any;
}

export interface ImportDocMessage {
  message: string;
}

interface TestGrokPatternResponse {
  matches: Array<{
    matched: boolean;
    fields: Record<string, Array<{ match: string; offset: number; length: number }>>;
  }>;
}

export class TextParser {
  private http: HttpSetup;
  private mappings: FindFileStructureResponse['mappings'];
  private ecsCompatibility: string | undefined;
  private excludeLinesRegex: RegExp | null;
  private multilineStartRegex: RegExp | null;
  private lineLimit: number;

  constructor(
    http: HttpSetup,
    mappings: FindFileStructureResponse['mappings'],
    ecsCompatibility: string | undefined,
    multilineStartPattern: string,
    excludeLinesPattern: string | undefined,
    lineLimit = 5
  ) {
    this.http = http;
    this.mappings = mappings;
    this.ecsCompatibility = ecsCompatibility;
    this.excludeLinesRegex =
      excludeLinesPattern === undefined ? null : new RegExp(excludeLinesPattern);
    this.multilineStartRegex =
      multilineStartPattern === undefined ? null : new RegExp(multilineStartPattern);
    this.lineLimit = lineLimit;
  }

  public async read(text: string, grokPattern: string) {
    const docs = this._createDocs(text, true);
    const lines = docs.docs.map((doc) => doc.message);
    const { matches } = await this.http.fetch<TestGrokPatternResponse>(
      '/internal/data_visualizer/test_grok_pattern',
      {
        method: 'POST',
        version: '1',
        body: JSON.stringify({
          grokPattern,
          text: lines,
          ecsCompatibility: this.ecsCompatibility,
        }),
      }
    );
    // const newLines = [];
    const formattedDocs = lines.map((line, index) => {
      const match = matches[index];
      if (match.matched === false) {
        return (
          <EuiText size="s" css={{ lineHeight: '24px' }}>
            <code>{line}</code>
          </EuiText>
        );
      }

      const sortedFields = Object.entries(match.fields)
        .map(([fieldName, [value]]) => {
          const type = this.mappings.properties[fieldName]?.type ?? '';
          return {
            name: fieldName,
            match: value.match,
            offset: value.offset,
            length: value.length,
            type,
          };
        })
        .sort((a, b) => a.offset - b.offset);
      // replace the original line with the matched fields
      const message: JSX.Element[] = [];
      let offset = 0;
      sortedFields.forEach((field) => {
        message.push(<span>{line.substring(offset, field.offset)}</span>);
        message.push(<FieldBadge type={getSupportedFieldType(field.type)} value={field.match} />);
        offset = field.offset + field.length;
      });
      message.push(<span>{line.substring(offset)}</span>);
      return (
        <EuiText size="s" css={{ lineHeight: '24px' }}>
          <code>{message}</code>
        </EuiText>
      );
    });
    return formattedDocs;
  }

  // split the text into an array of lines by looking for newlines.
  // any lines that match the exclude_lines_pattern regex are ignored.
  // if a newline is found, check the next line to see if it starts with the
  // multiline_start_pattern regex
  // if it does, it is a legitimate end of line and can be pushed into the list,
  // if not, it must be a newline char inside a field value, so keep looking.
  private _createDocs(text: string, isLastPart: boolean): CreateDocsResponse {
    let remainder = 0;
    try {
      const docs: ImportDocMessage[] = [];

      let message = '';
      let line = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const isLastChar = i === text.length - 1;
        if (char === '\n') {
          message = this._processLine(docs, message, line);
          line = '';
        } else if (isLastPart && isLastChar) {
          // if this is the end of the last line and the last chunk of data,
          // add the remainder as a final line.
          // just in case the last line doesn't end in a new line char.
          line += char;
          message = this._processLine(docs, message, line);
          line = '';
        } else {
          line += char;
        }
        if (docs.length >= this.lineLimit) {
          break;
        }
      }

      remainder = line.length;

      // // add the last message to the list if not already done
      if (message !== '') {
        this._addMessage(docs, message);
      }

      // remove first line if it is blank
      if (docs[0] && docs[0].message === '') {
        docs.shift();
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

  private _processLine(data: ImportDocMessage[], message: string, line: string) {
    if (this.excludeLinesRegex === null || line.match(this.excludeLinesRegex) === null) {
      if (this.multilineStartRegex === null || line.match(this.multilineStartRegex) !== null) {
        this._addMessage(data, message);
        message = '';
      } else if (data.length === 0) {
        // discard everything before the first line that is considered the first line of a message
        // as it could be left over partial data from a spilt or rolled over log,
        // or could be a blank line after the header in a csv file
        return '';
      } else {
        message += '\n';
      }
      message += line;
    }
    return message;
  }

  private _addMessage(data: ImportDocMessage[], message: string) {
    // if the message ended \r\n (Windows line endings)
    // then omit the \r as well as the \n for consistency
    message = message.replace(/\r$/, '');
    data.push({ message });
  }
}
