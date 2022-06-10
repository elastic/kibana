/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MarkdownLang } from '@kbn/kibana-react-plugin/public';
import { ViewStrings } from '../../../i18n';

const { Markdown: strings } = ViewStrings;

export const markdown = () => ({
  name: 'markdown',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  modelArgs: [],
  requiresContext: false,
  args: [
    {
      name: '_',
      displayName: strings.getContentDisplayName(),
      help: strings.getContentHelp(),
      argType: 'editor',
      options: { language: MarkdownLang },
      multi: true,
    },
    {
      name: 'font',
      argType: 'font',
    },
    {
      name: 'openLinksInNewTab',
      displayName: strings.getOpenLinksInNewTabDisplayName(),
      help: strings.getOpenLinksInNewTabHelp(),
      label: strings.getOpenLinksInNewTabLabelName(),
      argType: 'toggle',
      default: false,
      options: {
        labelValue: strings.getOpenLinksInNewTabLabelName(),
      },
    },
  ],
});
