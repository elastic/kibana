/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TCP = i18n.translate('xpack.securitySolution.timeline.tcp', {
  defaultMessage: 'TCP',
});

export const DESTINATION = i18n.translate('xpack.securitySolution.timeline.destination', {
  defaultMessage: 'Destination',
});

export const FROM_ITS_ORIGINAL_PATH = i18n.translate(
  'xpack.securitySolution.timeline.file.fromOriginalPathDescription',
  {
    defaultMessage: 'from its original path',
  }
);

export const PROTOCOL = i18n.translate('xpack.securitySolution.timeline.protocol', {
  defaultMessage: 'Protocol',
});

export const SOURCE = i18n.translate('xpack.securitySolution.timeline.source', {
  defaultMessage: 'Source',
});

export const IN = i18n.translate('xpack.securitySolution.auditd.inDescription', {
  defaultMessage: 'in',
});

export const NON_EXISTENT = i18n.translate('xpack.securitySolution.auditd.nonExistentDescription', {
  defaultMessage: 'an unknown process',
});

export const LINK_ELASTIC_ENDPOINT_SECURITY = i18n.translate(
  'xpack.securitySolution.event.module.linkToElasticEndpointSecurityDescription',
  {
    defaultMessage: 'Open in Endpoint Security',
  }
);

export const EMPTY_STATUS = i18n.translate(
  'xpack.securitySolution.hostIsolation.agentStatuses.empty',
  {
    defaultMessage: '-',
  }
);

export const REASON_RENDERER_TITLE = (eventRendererName: string) =>
  i18n.translate('xpack.securitySolution.event.reason.reasonRendererTitle', {
    values: { eventRendererName },
    defaultMessage: 'Event renderer: {eventRendererName} ',
  });
