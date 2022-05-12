/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Importer } from './importer';
import { ImportDocMessage } from '../../common/types';
import { CreateDocsResponse, ImportFactoryOptions } from './types';

export class MessageImporter extends Importer {
  private _excludeLinesRegex: RegExp | null;
  private _multilineStartRegex: RegExp | null;

  constructor(options: ImportFactoryOptions) {
    super();

    this._excludeLinesRegex =
      options.excludeLinesPattern === undefined ? null : new RegExp(options.excludeLinesPattern);
    this._multilineStartRegex =
      options.multilineStartPattern === undefined
        ? null
        : new RegExp(options.multilineStartPattern);
  }

  // split the text into an array of lines by looking for newlines.
  // any lines that match the exclude_lines_pattern regex are ignored.
  // if a newline is found, check the next line to see if it starts with the
  // multiline_start_pattern regex
  // if it does, it is a legitimate end of line and can be pushed into the list,
  // if not, it must be a newline char inside a field value, so keep looking.
  protected _createDocs(text: string, isLastPart: boolean): CreateDocsResponse {
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

  private _addMessage(data: ImportDocMessage[], message: string) {
    // if the message ended \r\n (Windows line endings)
    // then omit the \r as well as the \n for consistency
    message = message.replace(/\r$/, '');
    data.push({ message });
  }
}
