/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const POPOVER_ID = 'data-stream-selector-popover';
export const INTEGRATION_PANEL_ID = 'integrations_panel';
export const UNCATEGORIZED_STREAMS_PANEL_ID = 'uncategorized_streams_panel';

export const DATA_VIEW_POPOVER_CONTENT_WIDTH = 300;

export const contextMenuStyles = { maxHeight: 320 };

export const selectViewLabel = i18n.translate(
  'xpack.observabilityLogs.dataStreamSelector.selectView',
  { defaultMessage: 'Select view' }
);

export const integrationsLabel = i18n.translate(
  'xpack.observabilityLogs.dataStreamSelector.integrations',
  { defaultMessage: 'Integrations' }
);

export const uncategorizedLabel = i18n.translate(
  'xpack.observabilityLogs.dataStreamSelector.uncategorized',
  { defaultMessage: 'Uncategorized' }
);
