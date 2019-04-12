/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const HOSTS = i18n.translate('xpack.siem.kpiHosts.source.hostsTitle', {
  defaultMessage: 'Hosts',
});

export const INSTALLED_PACKAGES = i18n.translate(
  'xpack.siem.kpiHosts.source.installedPackagesTitle',
  {
    defaultMessage: 'Packages',
  }
);

export const PROCESS_COUNT = i18n.translate('xpack.siem.kpiHosts.source.processCountsTitle', {
  defaultMessage: 'Processes',
});

export const AUTHENTICATION_SUCCESS = i18n.translate(
  'xpack.siem.kpiHosts.source.authenticationSuccessTitle',
  {
    defaultMessage: 'Authentication Success',
  }
);

export const AUTHENTICATION_FAILURE = i18n.translate(
  'xpack.siem.kpiHosts.source.authenticationFailureTitle',
  {
    defaultMessage: 'Authentication Failure',
  }
);

export const FIM_EVENTS = i18n.translate('xpack.siem.kpiHosts.source.fimEventsTitle', {
  defaultMessage: 'Auditbeat FIM Events',
});

export const AUDITD_EVENTS = i18n.translate('xpack.siem.kpiHosts.source.auditEventsTitle', {
  defaultMessage: 'Auditbeat Auditd Events',
});

export const WINLOGBEAT_EVENTS = i18n.translate(
  'xpack.siem.kpiHosts.source.winlogbeatEventsTitle',
  {
    defaultMessage: 'Winlogbeat Events',
  }
);

export const FILEBEAT_EVENTS = i18n.translate('xpack.siem.kpiHosts.source.filebeatEventsTitle', {
  defaultMessage: 'Filebeat Events',
});

export const SOCKETS = i18n.translate('xpack.siem.kpiHosts.source.socketsTitle', {
  defaultMessage: 'Sockets',
});

export const UNIQUE_SOURCE_IPS = i18n.translate('xpack.siem.kpiHosts.source.uniqueSourceIpsTitle', {
  defaultMessage: 'Unique Source Ips',
});

export const UNIQUE_DESTINATION_IPS = i18n.translate(
  'xpack.siem.kpiHosts.source.uniqueDestinationIpsTitle',
  {
    defaultMessage: 'Unique Destination Ips',
  }
);
