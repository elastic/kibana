/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { removeExternalLinkText } from '../../common/test_utils';
import { MarkdownRenderer } from './renderer';
import { AppMockRenderer, createAppMockRenderer } from '../../common/mock';

describe('Markdown', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  describe('markdown links', () => {
    const markdownWithLink = 'A link to an external site [External Site](https://google.com)';

    test('it renders the expected link text', () => {
      const result = appMockRender.render(<MarkdownRenderer>{markdownWithLink}</MarkdownRenderer>);

      expect(removeExternalLinkText(result.getByTestId('markdown-link').textContent)).toContain(
        'External Site'
      );
    });

    test('it renders the expected href', () => {
      const result = appMockRender.render(<MarkdownRenderer>{markdownWithLink}</MarkdownRenderer>);

      expect(result.getByTestId('markdown-link')).toHaveProperty('href', 'https://google.com/');
    });

    test('it does NOT render the href if links are disabled', () => {
      const result = appMockRender.render(
        <MarkdownRenderer disableLinks={true}>{markdownWithLink}</MarkdownRenderer>
      );

      expect(result.getByTestId('markdown-link')).not.toHaveProperty('href');
    });

    test('it opens links in a new tab via target="_blank"', () => {
      const result = appMockRender.render(<MarkdownRenderer>{markdownWithLink}</MarkdownRenderer>);

      expect(result.getByTestId('markdown-link')).toHaveProperty('target', '_blank');
    });

    test('it sets the link `rel` attribute to `noopener` to prevent the new page from accessing `window.opener`, `nofollow` to note the link is not endorsed by us, and noreferrer to prevent the browser from sending the current address', () => {
      const result = appMockRender.render(<MarkdownRenderer>{markdownWithLink}</MarkdownRenderer>);

      expect(result.getByTestId('markdown-link')).toHaveProperty(
        'rel',
        'nofollow noopener noreferrer'
      );
    });
  });
});
