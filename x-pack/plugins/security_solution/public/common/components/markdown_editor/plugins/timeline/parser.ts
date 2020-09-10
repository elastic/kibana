/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { Plugin } from '@elastic/eui/node_modules/unified';
import { RemarkTokenizer } from '@elastic/eui';
import { ID, PREFIX, OLD_PREFIX } from './constants';
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
  let oldFormat = false;

  const parseOldFormat: RemarkTokenizer = function (eat, value, silent) {
    let index = 0;
    const nextChar = value[index];

    if (nextChar !== '[') return false; // this isn't actually a  timeline

    if (silent) {
      return true;
    }

    function readArg(open: string, close: string) {
      if (value[index] !== open) throw new Error('Expected left bracket');
      index++;

      let body = '';
      let openBrackets = 0;

      for (; index < value.length; index++) {
        const char = value[index];

        if (char === close && openBrackets === 0) {
          index++;
          return body;
        } else if (char === close) {
          openBrackets--;
        } else if (char === open) {
          openBrackets++;
        }

        body += char;
      }

      return '';
    }

    const timelineTitle = readArg('[', ']');
    const timelineUrl = readArg('(', ')');

    const now = eat.now();

    if (!timelineTitle) {
      this.file.info('No timeline name found', {
        line: now.line,
        column: now.column,
      });
    }

    if (!timelineUrl) {
      this.file.info('No timeline url found', {
        line: now.line,
        column: now.column + 2 + timelineUrl.length,
      });
    }

    if (!timelineTitle || !timelineUrl) return false;

    const timelineId = timelineUrl.split('timeline=(id:')[1].split("'")[1] ?? '';
    const graphEventId = timelineUrl.includes('graphEventId:')
      ? timelineUrl.split('graphEventId:')[1].split("'")[1] ?? ''
      : '';

    if (!timelineId) {
      this.file.info('No timeline id found', {
        line: now.line,
        column: now.column + 2 + timelineId.length,
      });
    }

    if (!timelineId) return false;

    return eat(`[${timelineTitle}](${timelineUrl})`)({
      type: ID,
      id: timelineId,
      title: timelineTitle,
      graphEventId,
    });
  };

  const parseNewFormat: RemarkTokenizer = function (eat, value, silent) {
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

  const tokenizeTimeline: RemarkTokenizer = function tokenizeTimeline(eat, value, silent) {
    if (value.startsWith(PREFIX) === false && value.startsWith(OLD_PREFIX) === false) return false;

    if (value.startsWith(OLD_PREFIX)) {
      oldFormat = true;
      parseOldFormat.call(this, eat, value, silent);
    }

    parseNewFormat.call(this, eat, value, silent);
  };

  tokenizeTimeline.locator = (value: string, fromIndex: number) => {
    return value.indexOf(oldFormat ? OLD_PREFIX : PREFIX, fromIndex);
  };

  tokenizers.timeline = tokenizeTimeline;
  methods.splice(methods.indexOf('url'), 0, ID);
};
