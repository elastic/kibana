/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const CLOSE_TIMELINE = i18n.translate(
  'xpack.securitySolution.timeline.flyout.header.closeTimelineButtonLabel',
  {
    defaultMessage: 'Close timeline',
  }
);

export const UNSAVED = i18n.translate('xpack.securitySolution.timeline.properties.unsavedLabel', {
  defaultMessage: 'Unsaved',
});

export const AUTOSAVED = i18n.translate(
  'xpack.securitySolution.timeline.properties.autosavedLabel',
  {
    defaultMessage: 'Autosaved',
  }
);

export const INSPECT_TIMELINE_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.properties.inspectTimelineTitle',
  {
    defaultMessage: 'Timeline',
  }
);

export const TIMELINE_TOGGLE_BUTTON_ARIA_LABEL = ({
  isOpen,
  title,
}: {
  isOpen: boolean;
  title: string;
}) =>
  i18n.translate('xpack.securitySolution.timeline.properties.timelineToggleButtonAriaLabel', {
    values: { isOpen, title },
    defaultMessage: '{isOpen, select, false {Open} true {Close} other {Toggle}} timeline {title}',
  });
