/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  AGENT_NAME,
  CLIENT_GEO_COUNTRY_ISO_CODE,
  CONTAINER_ID,
  HOST_NAME,
  POD_NAME,
  SERVICE_NAME,
  SERVICE_VERSION,
  TRANSACTION_RESULT,
  TRANSACTION_URL,
  USER_AGENT_DEVICE,
  USER_AGENT_NAME,
  USER_AGENT_OS,
} from './elasticsearch_fieldnames';

export const filtersByName = {
  host: {
    title: i18n.translate('xpack.apm.localFilters.titles.host', {
      defaultMessage: 'Host',
    }),
    fieldName: HOST_NAME,
  },
  agentName: {
    title: i18n.translate('xpack.apm.localFilters.titles.agentName', {
      defaultMessage: 'Agent name',
    }),
    fieldName: AGENT_NAME,
  },
  containerId: {
    title: i18n.translate('xpack.apm.localFilters.titles.containerId', {
      defaultMessage: 'Container ID',
    }),
    fieldName: CONTAINER_ID,
  },
  podName: {
    title: i18n.translate('xpack.apm.localFilters.titles.podName', {
      defaultMessage: 'Kubernetes pod',
    }),
    fieldName: POD_NAME,
  },
  transactionResult: {
    title: i18n.translate('xpack.apm.localFilters.titles.transactionResult', {
      defaultMessage: 'Transaction result',
    }),
    fieldName: TRANSACTION_RESULT,
  },
  serviceVersion: {
    title: i18n.translate('xpack.apm.localFilters.titles.serviceVersion', {
      defaultMessage: 'Service version',
    }),
    fieldName: SERVICE_VERSION,
  },
  transactionUrl: {
    title: i18n.translate('xpack.apm.localFilters.titles.transactionUrl', {
      defaultMessage: 'Url',
    }),
    fieldName: TRANSACTION_URL,
  },
  browser: {
    title: i18n.translate('xpack.apm.localFilters.titles.browser', {
      defaultMessage: 'Browser',
    }),
    fieldName: USER_AGENT_NAME,
  },
  device: {
    title: i18n.translate('xpack.apm.localFilters.titles.device', {
      defaultMessage: 'Device',
    }),
    fieldName: USER_AGENT_DEVICE,
  },
  location: {
    title: i18n.translate('xpack.apm.localFilters.titles.location', {
      defaultMessage: 'Location',
    }),
    fieldName: CLIENT_GEO_COUNTRY_ISO_CODE,
  },
  os: {
    title: i18n.translate('xpack.apm.localFilters.titles.os', {
      defaultMessage: 'OS',
    }),
    fieldName: USER_AGENT_OS,
  },
  serviceName: {
    title: i18n.translate('xpack.apm.localFilters.titles.serviceName', {
      defaultMessage: 'Service name',
    }),
    fieldName: SERVICE_NAME,
  },
};

export type LocalUIFilterName = keyof typeof filtersByName;
