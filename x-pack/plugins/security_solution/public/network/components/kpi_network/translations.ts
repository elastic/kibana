/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const NETWORK_EVENTS = i18n.translate(
  'xpack.securitySolution.kpiNetwork.networkEvents.title',
  {
    defaultMessage: 'Network events',
  }
);

export const UNIQUE_FLOW_IDS = i18n.translate(
  'xpack.securitySolution.kpiNetwork.uniqueFlowIds.title',
  {
    defaultMessage: 'Unique flow IDs',
  }
);

export const DNS_QUERIES = i18n.translate('xpack.securitySolution.kpiNetwork.dnsQueries.title', {
  defaultMessage: 'DNS queries',
});

export const TLS_HANDSHAKES = i18n.translate(
  'xpack.securitySolution.kpiNetwork.tlsHandshakes.title',
  {
    defaultMessage: 'TLS handshakes',
  }
);

export const UNIQUE_PRIVATE_IPS = i18n.translate(
  'xpack.securitySolution.kpiNetwork.uniquePrivateIps.title',
  {
    defaultMessage: 'Unique private IPs',
  }
);

export const SOURCE_UNIT_LABEL = i18n.translate(
  'xpack.securitySolution.kpiNetwork.uniquePrivateIps.sourceUnitLabel',
  {
    defaultMessage: 'source',
  }
);

export const DESTINATION_UNIT_LABEL = i18n.translate(
  'xpack.securitySolution.kpiNetwork.uniquePrivateIps.destinationUnitLabel',
  {
    defaultMessage: 'destination',
  }
);

export const SOURCE_CHART_LABEL = i18n.translate(
  'xpack.securitySolution.kpiNetwork.uniquePrivateIps.sourceChartLabel',
  {
    defaultMessage: 'Src.',
  }
);

export const DESTINATION_CHART_LABEL = i18n.translate(
  'xpack.securitySolution.kpiNetwork.uniquePrivateIps.destinationChartLabel',
  {
    defaultMessage: 'Dest.',
  }
);
