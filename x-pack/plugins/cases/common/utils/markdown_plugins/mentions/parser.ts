/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin } from 'unified';
import type { RemarkTokenizer } from '@elastic/eui';
import { ID, PREFIX } from './constants';

export const MentionsParser: Plugin = function MentionsParser() {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.blockTokenizers;
  const methods = Parser.prototype.blockMethods;

  const tokenizeMentions: RemarkTokenizer = function tokenizeMentions(
    eat,
    value,
    silent
  ) {
    if (value.startsWith(PREFIX) === false) return false;

    let mention = '';
    for (let i = 1; i < value.length; i++) {
      const char = value[i];
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        break;
      } else {
        mention += char;
      }
    }

    if (silent) {
      return true;
    }

    const match = `${PREFIX}${mention}`;

    const now = eat.now();
    const offset = mention.length + 1;
    now.column += offset;
    now.offset += offset;

    return eat(match)({
      type: ID,
      mention,
    });
  };

  tokenizeMentions.locator = (value, fromIndex) => {
    return value.indexOf('@', fromIndex);
  };

  tokenizers.mentions = tokenizeMentions;
  methods.splice(methods.indexOf('text'), 0, ID);
};
