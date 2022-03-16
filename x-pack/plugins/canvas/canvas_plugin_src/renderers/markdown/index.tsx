/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { CSSProperties } from 'react';
import ReactDOM from 'react-dom';
import { CoreTheme } from 'kibana/public';
import { Observable } from 'rxjs';
import { KibanaThemeProvider } from '../../../../../../src/plugins/kibana_react/public';
import { defaultTheme$ } from '../../../../../../src/plugins/presentation_util/common/lib';
import { StartInitializer } from '../../plugin';
import { RendererStrings } from '../../../i18n';
import { Return as Config } from '../../functions/browser/markdown';
import { Markdown } from '../../../../../../src/plugins/kibana_react/public';
import { RendererFactory } from '../../../types';

const { markdown: strings } = RendererStrings;

export const getMarkdownRenderer =
  (theme$: Observable<CoreTheme> = defaultTheme$): RendererFactory<Config> =>
  () => ({
    name: 'markdown',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render(domNode, config, handlers) {
      const fontStyle = config.font ? config.font.spec : {};

      ReactDOM.render(
        <KibanaThemeProvider theme$={theme$}>
          <Markdown
            className="canvasMarkdown"
            style={fontStyle as CSSProperties}
            markdown={config.content}
            openLinksInNewTab={config.openLinksInNewTab}
          />
        </KibanaThemeProvider>,
        domNode,
        () => handlers.done()
      );

      handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
    },
  });

export const markdownFactory: StartInitializer<RendererFactory<Config>> = (core, plugins) =>
  getMarkdownRenderer(core.theme.theme$);
