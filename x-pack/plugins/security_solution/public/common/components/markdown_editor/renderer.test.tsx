/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { removeExternalLinkText } from '@kbn/securitysolution-io-ts-utils';
import { MarkdownRenderer } from './renderer';

describe('Markdown', () => {
  describe('markdown links', () => {
    const markdownWithLink = 'A link to an external site [External Site](https://google.com)';

    test('it renders the expected link text', () => {
      const wrapper = mount(<MarkdownRenderer>{markdownWithLink}</MarkdownRenderer>);

      expect(
        removeExternalLinkText(wrapper.find('[data-test-subj="markdown-link"]').first().text())
      ).toEqual('External Site');
    });

    test('it renders the expected href', () => {
      const wrapper = mount(<MarkdownRenderer>{markdownWithLink}</MarkdownRenderer>);

      expect(wrapper.find('[data-test-subj="markdown-link"]').first().getDOMNode()).toHaveProperty(
        'href',
        'https://google.com/'
      );
    });

    test('it does NOT render the href if links are disabled', () => {
      const wrapper = mount(
        <MarkdownRenderer disableLinks={true}>{markdownWithLink}</MarkdownRenderer>
      );

      expect(
        wrapper.find('[data-test-subj="markdown-link"]').first().getDOMNode()
      ).not.toHaveProperty('href');
    });

    test('it opens links in a new tab via target="_blank"', () => {
      const wrapper = mount(<MarkdownRenderer>{markdownWithLink}</MarkdownRenderer>);

      expect(wrapper.find('[data-test-subj="markdown-link"]').first().getDOMNode()).toHaveProperty(
        'target',
        '_blank'
      );
    });

    test('it sets the link `rel` attribute to `noopener` to prevent the new page from accessing `window.opener`, `nofollow` to note the link is not endorsed by us, and noreferrer to prevent the browser from sending the current address', () => {
      const wrapper = mount(<MarkdownRenderer>{markdownWithLink}</MarkdownRenderer>);

      expect(wrapper.find('[data-test-subj="markdown-link"]').first().getDOMNode()).toHaveProperty(
        'rel',
        'nofollow noopener noreferrer'
      );
    });
  });
});
