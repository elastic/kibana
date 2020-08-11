/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const EVENT_RENDERERS_TITLE = i18n.translate(
  'xpack.securitySolution.customizeEventRenderers.eventRenderersTitle',
  {
    defaultMessage: 'Event Renderers',
  }
);

export const CUSTOMIZE_EVENT_RENDERERS_TITLE = i18n.translate(
  'xpack.securitySolution.customizeEventRenderers.customizeEventRenderersTitle',
  {
    defaultMessage: 'Customize Event Renderers',
  }
);

export const CUSTOMIZE_EVENT_RENDERERS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.customizeEventRenderers.customizeEventRenderersDescription',
  {
    defaultMessage:
      'Event Renderers automatically convey the most relevant details in an event to reveal its story',
  }
);

export const ENABLE_ALL = i18n.translate(
  'xpack.securitySolution.customizeEventRenderers.enableAllRenderersButtonLabel',
  {
    defaultMessage: 'Enable all',
  }
);

export const DISABLE_ALL = i18n.translate(
  'xpack.securitySolution.customizeEventRenderers.disableAllRenderersButtonLabel',
  {
    defaultMessage: 'Disable all',
  }
);
