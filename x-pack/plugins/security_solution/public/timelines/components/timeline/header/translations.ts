/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { TimelineType, TimelineTypeLiteral } from '../../../../../common/types/timeline';

export const CALL_OUT_UNAUTHORIZED_MSG = i18n.translate(
  'xpack.securitySolution.timeline.callOut.unauthorized.message.description',
  {
    defaultMessage:
      'You can use Timeline to investigate events, but you do not have the required permissions to save timelines for future use. If you need to save timelines, contact your Kibana administrator.',
  }
);

export const CALL_OUT_IMMUTABLE = i18n.translate(
  'xpack.securitySolution.timeline.callOut.immutable.message.description',
  {
    defaultMessage:
      'This prebuilt timeline template cannot be modified. To make changes, please duplicate this template and make modifications to the duplicate template.',
  }
);

export const EDIT = i18n.translate('xpack.securitySolution.timeline.saveTimeline.modal.button', {
  defaultMessage: 'edit',
});

export const SAVE_TIMELINE = i18n.translate(
  'xpack.securitySolution.timeline.saveTimeline.modal.header',
  {
    defaultMessage: 'Save Timeline',
  }
);

export const SAVE_TIMELINE_TEMPLATE = i18n.translate(
  'xpack.securitySolution.timeline.saveTimelineTemplate.modal.header',
  {
    defaultMessage: 'Save Timeline Template',
  }
);

export const SAVE = i18n.translate('xpack.securitySolution.timeline.nameTimeline.save.title', {
  defaultMessage: 'Save',
});

export const NAME_TIMELINE = i18n.translate(
  'xpack.securitySolution.timeline.nameTimeline.modal.header',
  {
    defaultMessage: 'Name Timeline',
  }
);

export const NAME_TIMELINE_TEMPLATE = i18n.translate(
  'xpack.securitySolution.timeline.nameTimelineTemplate.modal.header',
  {
    defaultMessage: 'Name Timeline Template',
  }
);

export const DISCARD_TIMELINE = i18n.translate(
  'xpack.securitySolution.timeline.saveTimeline.modal.discard.title',
  {
    defaultMessage: 'Discard Timeline',
  }
);

export const DISCARD_TIMELINE_TEMPLATE = i18n.translate(
  'xpack.securitySolution.timeline.saveTimelineTemplate.modal.discard.title',
  {
    defaultMessage: 'Discard Timeline Template',
  }
);

export const CLOSE_MODAL = i18n.translate(
  'xpack.securitySolution.timeline.saveTimeline.modal.close.title',
  {
    defaultMessage: 'Close',
  }
);

export const UNSAVED_TIMELINE_WARNING = (timelineType: TimelineTypeLiteral) =>
  i18n.translate('xpack.securitySolution.timeline.saveTimeline.modal.warning.title', {
    values: { timeline: timelineType === TimelineType.template ? 'timeline template' : 'timeline' },
    defaultMessage: 'You have an unsaved {timeline}. Do you wish to save it?',
  });
