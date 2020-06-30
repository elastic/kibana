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
    values: { timeline: timelineType === TimelineType.template ? 'Template timeline' : 'Timeline' },
    defaultMessage: 'e.g. {timeline} name or description',
  });

export const INSERT_TIMELINE = i18n.translate(
  'xpack.securitySolution.insert.timeline.insertTimelineButton',
  {
    defaultMessage: 'Insert timeline link',
  }
);
