/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const txtUrlTemplatePlaceholder = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlTemplatePlaceholderText',
  {
    defaultMessage: 'Example: {exampleUrl}',
    values: {
      exampleUrl: 'https://www.my-url.com/?{{event.key}}={{event.value}}',
    },
  }
);

export const txtUrlPreviewHelpText = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlPreviewHelpText',
  {
    defaultMessage:
      'Please note that in preview \\{\\{event.*\\}\\} variables are substituted with dummy values.',
  }
);

export const txtUrlTemplateLabel = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlTemplateLabel',
  {
    defaultMessage: 'Enter URL',
  }
);

export const txtUrlTemplateSyntaxHelpLinkText = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlTemplateSyntaxHelpLinkText',
  {
    defaultMessage: 'Syntax help',
  }
);

export const txtUrlTemplatePreviewLabel = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlPreviewLabel',
  {
    defaultMessage: 'URL preview:',
  }
);

export const txtUrlTemplatePreviewLinkText = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlPreviewLinkText',
  {
    defaultMessage: 'Preview',
  }
);

export const txtUrlTemplateOpenInNewTab = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.openInNewTabLabel',
  {
    defaultMessage: 'Open in new window',
  }
);

export const txtUrlTemplateAdditionalOptions = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.additionalOptions',
  {
    defaultMessage: 'Additional options',
  }
);

export const txtUrlTemplateEncodeUrl = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.encodeUrl',
  {
    defaultMessage: 'Encode URL',
  }
);

export const txtUrlTemplateEncodeDescription = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.encodeDescription',
  {
    defaultMessage: 'If enabled, URL will be escaped using percent encoding',
  }
);
