/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin } from 'unified';
import { RemarkTokenizer } from '@elastic/eui';
import { decode } from 'rison-node';
import { RemarkParser } from '@elastic/eui/src/components/markdown_editor/markdown_types';
import * as i18n from './translations';
import { Eat } from './types';

export const TIMELINE_ID = 'timeline';
const PREFIX = '[';

export const TimelineParser: Plugin = function () {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.blockTokenizers;
  const methods = Parser.prototype.blockMethods;

  const timelineTokenizer: RemarkTokenizer = createTokenizer();

  tokenizers.timeline = timelineTokenizer;
  methods.splice(methods.indexOf('url'), 0, TIMELINE_ID);
};

function createTokenizer(): RemarkTokenizer {
  const timelineTokenizer: RemarkTokenizer = function tokenize(eat, value, silent) {
    return parseTokens(this, eat, value, silent);
  };

  timelineTokenizer.locator = (value: string, fromIndex: number) => {
    return value.indexOf(PREFIX, fromIndex);
  };

  return timelineTokenizer;
}

function parseTokens(
  remarkParser: RemarkParser,
  eat: Eat,
  value: string,
  silent: boolean
): boolean | void {
  if (
    value.startsWith(PREFIX) === false ||
    (value.startsWith(PREFIX) === true && !value.includes('timelines?timeline=(id'))
  ) {
    return false;
  } else if (silent) {
    return true;
  }

  const timelineParser = new TimelineLinkParser(remarkParser, value, eat);
  try {
    const { title, url, id } = timelineParser.parse();

    const match = `[${title}](${url})`;

    return eat(match)({
      type: TIMELINE_ID,
      title,
      url,
      id,
    });
  } catch (error) {
    return false;
  }
}

export class TimelineLinkParser {
  constructor(
    private readonly remarkParser: RemarkParser,
    private readonly stringToParse: string,
    private readonly eat: Eat
  ) {}

  parse(): { title: string; url: string; id: string } {
    const { title, index: indexAfterTitle } = this.parseName(0);
    const { url, id } = this.parseUrl(indexAfterTitle);

    return { title, url, id };
  }

  private parseName(startingIndex: number): { title: string; index: number } {
    const { value: title, index } = this.parseValue({
      startingIndex,
      startCharacter: PREFIX,
      endCharacter: ']',
    });

    if (!title) {
      const currentParseLocation = this.eat.now();

      this.remarkParser.file.info(i18n.NO_TIMELINE_NAME_FOUND, {
        line: currentParseLocation.line,
        column: startingIndex,
      });

      throw new Error('Failed to parse title');
    }

    return { title, index };
  }

  private parseUrl(startingIndex: number): { url: string; id: string; index: number } {
    const { value: url, index } = this.parseValue({
      startingIndex,
      startCharacter: '(',
      endCharacter: ')',
    });

    if (!url) {
      const currentParseLocation = this.eat.now();

      this.remarkParser.file.info(i18n.NO_TIMELINE_URL_FOUND, {
        line: currentParseLocation.line,
        column: startingIndex,
      });

      throw new Error('Failed to parse url');
    }

    const id = parseId(url);

    return { url, id, index };
  }

  private parseValue({
    startingIndex,
    startCharacter,
    endCharacter,
  }: {
    startingIndex: number;
    startCharacter: string;
    endCharacter: string;
  }): { value: string; index: number } {
    let index = startingIndex;

    if (this.stringToParse[index] !== startCharacter) {
      throw new Error(i18n.NO_CHARACTER(startCharacter));
    }

    index++;

    let body = '';
    let openBrackets = 0;

    for (; index < this.stringToParse.length; index++) {
      const char = this.stringToParse[index];

      if (char === endCharacter && openBrackets === 0) {
        index++;
        return { value: body, index };
      } else if (char === endCharacter) {
        openBrackets--;
      } else if (char === startCharacter) {
        openBrackets++;
      }

      body += char;
    }

    return { value: '', index };
  }
}

function parseId(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const timelineQueryParam = parsedUrl.searchParams.get('timeline');

    if (!timelineQueryParam) {
      throw new Error('Failed to parse timeline query params');
    }

    const decodedQuery = decode(timelineQueryParam) as { id?: string };

    if (!decodedQuery?.id) {
      throw new Error('Timeline query does not contain mandatory id field');
    }

    return decodedQuery.id;
  } catch (error) {
    throw new Error(`Failed to parse timeline url: ${error}`);
  }
}
