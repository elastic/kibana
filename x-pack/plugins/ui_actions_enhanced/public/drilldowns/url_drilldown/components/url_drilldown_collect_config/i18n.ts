/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

export const txtAddVariableButtonTitle = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.addVariableButtonTitle',
  {
    defaultMessage: 'Add variable',
  }
);

export const txtUrlTemplateLabel = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlTemplateLabel',
  {
    defaultMessage: 'Enter URL template:',
  }
);

export const txtUrlTemplateHelpLinkText = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.urlDrilldownCollectConfig.urlTemplateHelpLinkText',
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
    defaultMessage: 'Open in new tab',
  }
);
