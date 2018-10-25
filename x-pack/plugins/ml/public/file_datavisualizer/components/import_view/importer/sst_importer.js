/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { Importer } from './importer';

export class SstImporter extends Importer {
  constructor(results, settings) {
    super(settings);

    this.format = results.format;
    this.multilineStartPattern = results.multiline_start_pattern;
    this.grokPattern = results.grok_pattern;
  }

  // convert the semi structured text string into an array of lines
  // by looking over each char, looking for newlines.
  // if one is found, check the next line to see if it starts with the
  // multiline_start_pattern regex
  // if it does, it is a legitimate end of line and can be pushed into the list,
  // if not, it must be a new line char inside a field value, so keep looking.
  async read(text) {
    try {
      const data = [];

      let message = '';
      let line = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '\n') {
          if (line.match(this.multilineStartPattern) !== null) {
            // the line buffer matches the start of a new message.
            // so push the last message to the list and clear the variable.
            data.push({ message });
            message = '';
          } else {
            // looks like this \n char is in the middle of a field.
            // so add the \n to end of the last message and keep going.
            message += char;
          }
          // move the line buffer to the message variable and clear the buffer
          message += line;
          line = '';
        } else {
          line += char;
        }
      }

      // add the last message to the list
      if (message !== '') {
        data.push({ message });
      }

      // add any left over line buffer to the data
      // needed in case the last line does not end with a \n character.
      // note, this could be a partial message
      if (line !== '') {
        if (line.match(this.multilineStartPattern) !== null) {
          // line starts with the multilineStartPattern, it looks like a complete line
          data.push({ message: line });
        }
        else {
          // line looks like the end of the last message
          // add it with a \n to preserve the one that
          // would have been lost when the loop ended
          if (data.length) {
            data[data.length - 1].message += `\n${line}`;
          }
        }
      }

      // remove first line if it is blank
      if (data[0] && data[0].message === '') {
        data.shift();
      }

      this.data = data;
      this.docArray = this.data;

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error,
      };
    }
  }
}
