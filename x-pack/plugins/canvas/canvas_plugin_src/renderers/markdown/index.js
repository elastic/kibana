/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import Markdown from 'markdown-it';

const md = new Markdown();

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
      <div className="kbnMarkdown__body" style={fontStyle} dangerouslySetInnerHTML={html} />,
      domNode,
      () => handlers.done()
    );
    /* eslint-enable */

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
