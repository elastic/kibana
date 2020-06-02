/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const HOSTS = i18n.translate('xpack.siem.kpiHosts.hosts.title', {
  defaultMessage: 'Hosts',
});

export const USER_AUTHENTICATIONS = i18n.translate(
  'xpack.siem.kpiHosts.userAuthentications.title',
  {
    defaultMessage: 'User authentications',
  }
);

export const SUCCESS_UNIT_LABEL = i18n.translate(
  'xpack.siem.kpiHosts.userAuthentications.successUnitLabel',
  {
    defaultMessage: 'success',
  }
);

export const FAIL_UNIT_LABEL = i18n.translate(
  'xpack.siem.kpiHosts.userAuthentications.failUnitLabel',
  {
    defaultMessage: 'fail',
  }
);

export const SUCCESS_CHART_LABEL = i18n.translate(
  'xpack.siem.kpiHosts.userAuthentications.successChartLabel',
  {
    defaultMessage: 'Succ.',
  }
);

export const FAIL_CHART_LABEL = i18n.translate(
  'xpack.siem.kpiHosts.userAuthentications.failChartLabel',
  {
    defaultMessage: 'Fail',
  }
);

export const UNIQUE_IPS = i18n.translate('xpack.siem.kpiHosts.uniqueIps.title', {
  defaultMessage: 'Unique IPs',
});

export const SOURCE_UNIT_LABEL = i18n.translate('xpack.siem.kpiHosts.uniqueIps.sourceUnitLabel', {
  defaultMessage: 'source',
});

export const DESTINATION_UNIT_LABEL = i18n.translate(
  'xpack.siem.kpiHosts.uniqueIps.destinationUnitLabel',
  {
    defaultMessage: 'destination',
  }
);

export const SOURCE_CHART_LABEL = i18n.translate('xpack.siem.kpiHosts.uniqueIps.sourceChartLabel', {
  defaultMessage: 'Src.',
});

export const DESTINATION_CHART_LABEL = i18n.translate(
  'xpack.siem.kpiHosts.uniqueIps.destinationChartLabel',
  {
    defaultMessage: 'Dest.',
  }
);
