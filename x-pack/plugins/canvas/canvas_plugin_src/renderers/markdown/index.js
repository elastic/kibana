/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { RendererStrings } from '../../../i18n';
import { Markdown } from '../../../../../../src/plugins/kibana_react/public';

const { markdown: strings } = RendererStrings;

export const markdown = () => ({
  name: 'markdown',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const fontStyle = config.font ? config.font.spec : {};

    ReactDOM.render(
      <Markdown
        className="canvasMarkdown"
        style={fontStyle}
        markdown={config.content}
        openLinksInNewTab={config.openLinksInNewTab}
      />,
      domNode,
      () => handlers.done()
    );

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
