/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { Plugin } from '@elastic/eui/node_modules/unified';
import { RemarkTokenizer } from '@elastic/eui';
import { ID, PREFIX } from './constants';
import { TimelineConfiguration } from './types';

const START_POS = PREFIX.length;

const requiredFields = ['id', 'title'];

const validateConfiguration = (configuration: TimelineConfiguration) => {
  requiredFields.forEach((field) => {
    if (isEmpty(configuration[field])) {
      throw new Error(`${field} is missing.`);
    }
  });
};

export const TimelineParser: Plugin = function () {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.inlineTokenizers;
  const methods = Parser.prototype.inlineMethods;

  const tokenizeTimeline: RemarkTokenizer = function tokenizeTimeline(eat, value, silent) {
    if (value.startsWith(PREFIX) === false) return false;

    const nextChar = value[START_POS];

    if (nextChar !== '{' && nextChar !== '}') return false; // this isn't actually a timeline

    if (silent) {
      return true;
    }

    // is there a configuration?
    const hasConfiguration = nextChar === '{';

    let match = PREFIX;
    let configuration = { id: null, title: '', url: '' };

    if (hasConfiguration) {
      let configurationString = '';

      let openObjects = 0;

      for (let i = START_POS; i < value.length; i++) {
        const char = value[i];
        if (char === '{') {
          openObjects++;
          configurationString += char;
        } else if (char === '}') {
          openObjects--;
          if (openObjects === -1) {
            break;
          }
          configurationString += char;
        } else {
          configurationString += char;
        }
      }

      match += configurationString;
      try {
        configuration = JSON.parse(configurationString);
        validateConfiguration(configuration);
      } catch (e) {
        const now = eat.now();
        this.file.fail(`Timeline parsing error: ${e}`, {
          line: now.line,
          column: now.column + 7,
        });
      }
    }

    match += '}';
    return eat(match)({
      type: ID,
      ...configuration,
    });
  };

  tokenizeTimeline.locator = (value: string, fromIndex: number) => {
    return value.indexOf(PREFIX, fromIndex);
  };

  tokenizers.timeline = tokenizeTimeline;
  methods.splice(methods.indexOf('text'), 0, ID);
};
