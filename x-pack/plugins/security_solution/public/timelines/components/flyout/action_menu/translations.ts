/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { TimelineTypeLiteral } from '../../../../../common/api/timeline';
import { TimelineType } from '../../../../../common/api/timeline';

export const NEW_TIMELINE_BTN = i18n.translate(
  'xpack.securitySolution.flyout.timeline.actionMenu.newTimelineBtn',
  {
    defaultMessage: 'New',
  }
);

export const NEW_TIMELINE = i18n.translate(
  'xpack.securitySolution.flyout.timeline.actionMenu.newTimeline',
  {
    defaultMessage: 'New Timeline',
  }
);

export const OPEN_TIMELINE_BTN = i18n.translate(
  'xpack.securitySolution.flyout.timeline.actionMenu.openTimelineBtn',
  {
    defaultMessage: 'Open',
  }
);

export const OPEN_TIMELINE_BTN_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.timeline.actionMenu.openTimelineBtnLabel',
  {
    defaultMessage: 'Open Existing Timeline',
  }
);

export const SAVE_TIMELINE_BTN = i18n.translate(
  'xpack.securitySolution.flyout.timeline.actionMenu.saveTimelineBtn',
  {
    defaultMessage: 'Save',
  }
);

export const SAVE_TIMELINE_BTN_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.timeline.actionMenu.saveTimelineBtnLabel',
  {
    defaultMessage: 'Save currently opened Timeline',
  }
);

export const NEW_TEMPLATE_TIMELINE = i18n.translate(
  'xpack.securitySolution.flyout.timeline.actionMenu.newTimelineTemplate',
  {
    defaultMessage: 'New Timeline template',
  }
);

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
    values: {
      timeline: timelineType === TimelineType.template ? 'timeline template' : 'timeline',
    },
    defaultMessage: 'You have an unsaved {timeline}. Do you wish to save it?',
  });

export const TIMELINE_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.saveTimeline.modal.titleAriaLabel',
  {
    defaultMessage: 'Title',
  }
);

export const TIMELINE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.timeline.saveTimeline.modal.descriptionLabel',
  {
    defaultMessage: 'Description',
  }
);

export const OPTIONAL = i18n.translate(
  'xpack.securitySolution.timeline.saveTimeline.modal.optionalLabel',
  {
    defaultMessage: 'Optional',
  }
);

export const SAVE_TOUR_CLOSE = i18n.translate(
  'xpack.securitySolution.timeline.flyout.saveTour.closeButton',
  {
    defaultMessage: 'Close',
  }
);

export const TITLE = i18n.translate('xpack.securitySolution.timeline.saveTimeline.modal.title', {
  defaultMessage: 'Title',
});

export const SAVE_TOUR_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.flyout.saveTour.title',
  {
    defaultMessage: 'Timeline changes now require manual saves',
  }
);

export const SAVE_AS_NEW = i18n.translate(
  'xpack.securitySolution.timeline.saveTimeline.modal.saveAsNew',
  {
    defaultMessage: 'Save as new timeline',
  }
);
