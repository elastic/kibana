/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CLOSE_TIMELINE_OR_TEMPLATE = (isTimeline: boolean) =>
  i18n.translate('xpack.securitySolution.timeline.flyout.header.closeTimelineButtonLabel', {
    defaultMessage: 'Close {isTimeline, select, true {timeline} false {template}}',
    values: {
      isTimeline,
    },
  });

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

export const PROCESS_KPI_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.kpis.processKpiTitle',
  {
    defaultMessage: 'Processes',
  }
);

export const HOST_KPI_TITLE = i18n.translate('xpack.securitySolution.timeline.kpis.hostKpiTitle', {
  defaultMessage: 'Hosts',
});

export const SOURCE_IP_KPI_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.kpis.sourceIpKpiTitle',
  {
    defaultMessage: 'Source IPs',
  }
);

export const DESTINATION_IP_KPI_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.kpis.destinationKpiTitle',
  {
    defaultMessage: 'Destination IPs',
  }
);

export const USER_KPI_TITLE = i18n.translate('xpack.securitySolution.timeline.kpis.userKpiTitle', {
  defaultMessage: 'Users',
});

export const READ_MORE = i18n.translate('xpack.securitySolution.timeline.properties.readMore', {
  defaultMessage: 'Read More',
});

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
