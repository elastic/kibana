/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const DEFAULT_TIMELINE_TITLE = i18n.translate('xpack.siem.timeline.defaultTimelineTitle', {
  defaultMessage: 'Default blank timeline',
});

export const DEFAULT_TIMELINE_DESCRIPTION = i18n.translate(
  'xpack.siem.timeline.defaultTimelineDescription',
  {
    defaultMessage: 'Timeline offered by default when creating new timeline.',
  }
);

export const SEARCH_BOX_TIMELINE_PLACEHOLDER = i18n.translate(
  'xpack.siem.timeline.searchBoxPlaceholder',
  {
    defaultMessage: 'e.g. timeline name or description',
  }
);
