/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Importer, ImportConfig, CreateDocsResponse } from './importer';
import {
  Doc,
  FindFileStructureResponse,
} from '../../../../../../../common/types/file_datavisualizer';

export class MessageImporter extends Importer {
  private _excludeLinesRegex: RegExp | null;
  private _multilineStartRegex: RegExp | null;

  constructor(results: FindFileStructureResponse, settings: ImportConfig) {
    super(settings);

    this._excludeLinesRegex =
      results.exclude_lines_pattern === undefined
        ? null
        : new RegExp(results.exclude_lines_pattern);
    this._multilineStartRegex =
      results.multiline_start_pattern === undefined
        ? null
        : new RegExp(results.multiline_start_pattern);
  }

  // split the text into an array of lines by looking for newlines.
  // any lines that match the exclude_lines_pattern regex are ignored.
  // if a newline is found, check the next line to see if it starts with the
  // multiline_start_pattern regex
  // if it does, it is a legitimate end of line and can be pushed into the list,
  // if not, it must be a newline char inside a field value, so keep looking.
  protected _createDocs(text: string): CreateDocsResponse {
    let remainder = 0;
    try {
      const docs: Doc[] = [];

      let message = '';
      let line = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '\n') {
          message = this._processLine(docs, message, line);
          line = '';
        } else {
          line += char;
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

  private _processLine(data: Doc[], message: string, line: string) {
    if (this._excludeLinesRegex === null || line.match(this._excludeLinesRegex) === null) {
      if (this._multilineStartRegex === null || line.match(this._multilineStartRegex) !== null) {
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

  private _addMessage(data: Doc[], message: string) {
    // if the message ended \r\n (Windows line endings)
    // then omit the \r as well as the \n for consistency
    message = message.replace(/\r$/, '');
    data.push({ message });
  }
}
