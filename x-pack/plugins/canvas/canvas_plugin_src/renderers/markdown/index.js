/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import Markdown from 'markdown-it';
import mila from 'markdown-it-link-attributes';
import { ELASTIC_WEBSITE_URL } from '../../../public/lib/documentation_links';
import { escapeRegExp } from '../../../common/lib/escape_reg_exp';

const ELASTIC_LINK = new RegExp(escapeRegExp(ELASTIC_WEBSITE_URL));
const NON_ELASTIC_EXTERNAL_LINK = new RegExp(
  `((http|https):\/\/(?!${escapeRegExp(ELASTIC_WEBSITE_URL)})[\w\.\/\-=?#]+)`
);
const md = new Markdown();

md.use(mila, [
  {
    // forward referrer information if destination is elastic.co
    pattern: ELASTIC_LINK,
    attrs: {
      target: '_blank',
      rel: 'noopener',
    },
  },
  {
    pattern: NON_ELASTIC_EXTERNAL_LINK,
    attrs: {
      target: '_blank',
      rel: 'noreferrer noopener',
    },
  },
  // internal links don't receive any attributes
]);

export const markdown = () => ({
  name: 'markdown',
  displayName: 'Markdown',
  help: 'Render HTML Markup using Markdown input',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const html = { __html: md.render(String(config.content)) };
    const fontStyle = config.font ? config.font.spec : {};

    /* eslint-disable react/no-danger */
    ReactDOM.render(
      <div
        className="kbnMarkdown__body canvasMarkdown"
        style={fontStyle}
        dangerouslySetInnerHTML={html}
      />,
      domNode,
      () => handlers.done()
    );
    /* eslint-enable */

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
