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

export const SHOW_ALL_INDICATOR_MATCHES = (count: number) =>
  i18n.translate('xpack.securitySolution.event.summary.threat_indicator.showMatches', {
    values: { count },
    defaultMessage: 'Show all {count} indicator match alerts',
  });

export const ALL_INDICATOR_MATCHES_MODAL_HEADER = i18n.translate(
  'xpack.securitySolution.event.summary.threat_indicator.modal.allMatches',
  {
    defaultMessage: 'All Indicator Matches',
  }
);

export const ALL_INDICATOR_MATCHES_MODAL_CLOSE = i18n.translate(
  'xpack.securitySolution.event.summary.threat_indicator.modal.close',
  {
    defaultMessage: 'Close',
  }
);
