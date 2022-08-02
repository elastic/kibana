/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper, fontStyle } from '@kbn/presentation-util-plugin/common/lib';
import { testTable } from '../common/__fixtures__/test_tables';
import { markdown } from './markdown';

describe('markdown', () => {
  const fn = functionWrapper(markdown);

  it('returns a render as markdown', async () => {
    const result = await fn(null, { content: [''], font: fontStyle });
    expect(result).toHaveProperty('type', 'render');
    expect(result).toHaveProperty('as', 'markdown');
  });

  describe('args', () => {
    describe('content', () => {
      it('sets the content to all strings in expression concatenated', async () => {
        const result = await fn(null, {
          content: ['# this ', 'is ', 'some ', 'markdown'],
          font: fontStyle,
        });

        expect(result.value).toHaveProperty('content', '# this is some markdown');
      });

      it('compiles and concatenates handlebars expressions using context', async () => {
        let expectedContent = 'Columns:';
        testTable.columns.map((col) => (expectedContent += ` ${col.name}`));

        const result = await fn(testTable, {
          content: ['Columns:', '{{#each columns}} {{name}}{{/each}}'],
        });

        expect(result.value).toHaveProperty('content', expectedContent);
      });
    });

    describe('font', () => {
      it('sets the font style for the markdown', async () => {
        const result = await fn(null, {
          content: ['some ', 'markdown'],
          font: fontStyle,
        });

        expect(result.value).toHaveProperty('font', fontStyle);
      });

      // TODO: write test when using an instance of the interpreter
      // it("defaults to the expression '{font}'", () => {});
    });
    describe('openLinksInNewTab', () => {
      it('sets the value of openLinksInNewTab to true ', async () => {
        const result = await fn(null, {
          content: ['some ', 'markdown'],
          openLinksInNewTab: true,
        });

        expect(result.value).toHaveProperty('openLinksInNewTab', true);
      });

      it('sets the value of openLinksInNewTab to false ', async () => {
        const result = await fn(null, {
          content: ['some ', 'markdown'],
          openLinksInNewTab: false,
        });

        expect(result.value).toHaveProperty('openLinksInNewTab', false);
      });

      it('defaults the value of openLinksInNewTab to false ', async () => {
        const result = await fn(null, {
          content: ['some ', 'markdown'],
        });

        expect(result.value).toHaveProperty('openLinksInNewTab', false);
      });
    });
  });
});
