/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { TimelineTypeLiteral, TimelineType } from '../../../../common/types/timeline';

export const DEFAULT_TIMELINE_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.defaultTimelineTitle',
  {
    defaultMessage: 'None',
  }
);

export const DEFAULT_TIMELINE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.timeline.defaultTimelineDescription',
  {
    defaultMessage: 'Timeline offered by default when creating new timeline.',
  }
);

export const SEARCH_BOX_TIMELINE_PLACEHOLDER = (timelineType: TimelineTypeLiteral) =>
  i18n.translate('xpack.securitySolution.timeline.searchBoxPlaceholder', {
    values: { timeline: timelineType === TimelineType.template ? 'Timeline template' : 'Timeline' },
    defaultMessage: 'e.g. {timeline} name or description',
  });

export const INSERT_TIMELINE = i18n.translate(
  'xpack.securitySolution.insert.timeline.insertTimelineButton',
  {
    defaultMessage: 'Insert timeline link',
  }
);

export const TIMELINE_TEMPLATE = i18n.translate(
  'xpack.securitySolution.timeline.flyoutTimelineTemplateLabel',
  {
    defaultMessage: 'Timeline template',
  }
);

export const LOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP = i18n.translate(
  'xpack.securitySolution.timeline.properties.lockDatePickerTooltip',
  {
    defaultMessage:
      'Disable syncing of date/time range between the currently viewed page and your timeline',
  }
);

export const UNLOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP = i18n.translate(
  'xpack.securitySolution.timeline.properties.unlockDatePickerTooltip',
  {
    defaultMessage:
      'Enable syncing of date/time range between the currently viewed page and your timeline',
  }
);

export const LOCK_SYNC_MAIN_DATE_PICKER_LABEL = i18n.translate(
  'xpack.securitySolution.timeline.properties.lockedDatePickerLabel',
  {
    defaultMessage: 'Date picker is locked to global date picker',
  }
);

export const UNLOCK_SYNC_MAIN_DATE_PICKER_LABEL = i18n.translate(
  'xpack.securitySolution.timeline.properties.unlockedDatePickerLabel',
  {
    defaultMessage: 'Date picker is NOT locked to global date picker',
  }
);

export const LOCK_SYNC_MAIN_DATE_PICKER_ARIA = i18n.translate(
  'xpack.securitySolution.timeline.properties.lockDatePickerDescription',
  {
    defaultMessage: 'Lock date picker to global date picker',
  }
);

export const UNLOCK_SYNC_MAIN_DATE_PICKER_ARIA = i18n.translate(
  'xpack.securitySolution.timeline.properties.unlockDatePickerDescription',
  {
    defaultMessage: 'Unlock date picker to global date picker',
  }
);
