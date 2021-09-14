/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseCommentString, stringifyMarkdownComment } from './utils';

describe('markdown utils', () => {
  describe('stringifyComment', () => {
    it('adds a newline to the end if one does not exist', () => {
      const parsed = parseCommentString('hello');
      expect(stringifyMarkdownComment(parsed)).toEqual('hello\n');
    });

    it('does not add a newline to the end if one already exists', () => {
      const parsed = parseCommentString('hello\n');
      expect(stringifyMarkdownComment(parsed)).toEqual('hello\n');
    });
  });
});
