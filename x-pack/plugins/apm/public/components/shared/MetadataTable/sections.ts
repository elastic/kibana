/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export interface Section {
  key: string;
  label: string;
  required?: boolean;
  properties?: string[];
}

export const LABELS: Section = {
  key: 'labels',
  label: i18n.translate('xpack.apm.metadataTable.section.labelsLabel', {
    defaultMessage: 'Labels',
  }),
};

export const HTTP: Section = {
  key: 'http',
  label: i18n.translate('xpack.apm.metadataTable.section.httpLabel', {
    defaultMessage: 'HTTP',
  }),
};

export const HOST: Section = {
  key: 'host',
  label: i18n.translate('xpack.apm.metadataTable.section.hostLabel', {
    defaultMessage: 'Host',
  }),
};

export const CLIENT: Section = {
  key: 'client',
  label: i18n.translate('xpack.apm.metadataTable.section.clientLabel', {
    defaultMessage: 'Client',
  }),
  properties: ['ip'],
};

export const CONTAINER: Section = {
  key: 'container',
  label: i18n.translate('xpack.apm.metadataTable.section.containerLabel', {
    defaultMessage: 'Container',
  }),
};

export const SERVICE: Section = {
  key: 'service',
  label: i18n.translate('xpack.apm.metadataTable.section.serviceLabel', {
    defaultMessage: 'Service',
  }),
};

export const PROCESS: Section = {
  key: 'process',
  label: i18n.translate('xpack.apm.metadataTable.section.processLabel', {
    defaultMessage: 'Process',
  }),
};

export const AGENT: Section = {
  key: 'agent',
  label: i18n.translate('xpack.apm.metadataTable.section.agentLabel', {
    defaultMessage: 'Agent',
  }),
};

export const URL: Section = {
  key: 'url',
  label: i18n.translate('xpack.apm.metadataTable.section.urlLabel', {
    defaultMessage: 'URL',
  }),
};

export const USER: Section = {
  key: 'user',
  label: i18n.translate('xpack.apm.metadataTable.section.userLabel', {
    defaultMessage: 'User',
  }),
};

export const USER_AGENT: Section = {
  key: 'user_agent',
  label: i18n.translate('xpack.apm.metadataTable.section.userAgentLabel', {
    defaultMessage: 'User agent',
  }),
};

export const PAGE: Section = {
  key: 'page',
  label: i18n.translate('xpack.apm.metadataTable.section.pageLabel', {
    defaultMessage: 'Page',
  }),
};

export const SPAN: Section = {
  key: 'span',
  label: i18n.translate('xpack.apm.metadataTable.section.spanLabel', {
    defaultMessage: 'Span',
  }),
  properties: ['id'],
};

export const TRANSACTION: Section = {
  key: 'transaction',
  label: i18n.translate('xpack.apm.metadataTable.section.transactionLabel', {
    defaultMessage: 'Transaction',
  }),
  properties: ['id'],
};

export const TRACE: Section = {
  key: 'trace',
  label: i18n.translate('xpack.apm.metadataTable.section.traceLabel', {
    defaultMessage: 'Trace',
  }),
  properties: ['id'],
};

export const ERROR: Section = {
  key: 'error',
  label: i18n.translate('xpack.apm.metadataTable.section.errorLabel', {
    defaultMessage: 'Error',
  }),
  properties: ['id'],
};

const customLabel = i18n.translate(
  'xpack.apm.metadataTable.section.customLabel',
  {
    defaultMessage: 'Custom',
  }
);

export const CUSTOM_ERROR: Section = {
  key: 'error.custom',
  label: customLabel,
};
export const CUSTOM_TRANSACTION: Section = {
  key: 'transaction.custom',
  label: customLabel,
};

const messageLabel = i18n.translate(
  'xpack.apm.metadataTable.section.messageLabel',
  {
    defaultMessage: 'Message',
  }
);

export const MESSAGE_TRANSACTION: Section = {
  key: 'transaction.message',
  label: messageLabel,
};

export const MESSAGE_SPAN: Section = {
  key: 'span.message',
  label: messageLabel,
};
