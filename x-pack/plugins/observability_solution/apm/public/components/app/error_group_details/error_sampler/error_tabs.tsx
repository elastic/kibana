/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { APMError } from '../../../../../typings/es_schemas/ui/apm_error';

export enum ErrorTabKey {
  LogStackTrace = 'log_stacktrace',
  ExceptionStacktrace = 'exception_stacktrace',
  Metadata = 'metadata',
}

export interface ErrorTab {
  key: ErrorTabKey;
  label: string;
}

export const logStacktraceTab: ErrorTab = {
  key: ErrorTabKey.LogStackTrace,
  label: i18n.translate('xpack.apm.errorGroup.tabs.logStacktraceLabel', {
    defaultMessage: 'Log stack trace',
  }),
};

export const exceptionStacktraceTab: ErrorTab = {
  key: ErrorTabKey.ExceptionStacktrace,
  label: i18n.translate('xpack.apm.errorGroup.tabs.exceptionStacktraceLabel', {
    defaultMessage: 'Exception stack trace',
  }),
};

export const metadataTab: ErrorTab = {
  key: ErrorTabKey.Metadata,
  label: i18n.translate('xpack.apm.errorGroup.tabs.metadataLabel', {
    defaultMessage: 'Metadata',
  }),
};

export function getTabs(error: { error: { log?: APMError['error']['log'] } }) {
  const hasLogStacktrace = !isEmpty(error?.error.log?.stacktrace);
  return [...(hasLogStacktrace ? [logStacktraceTab] : []), exceptionStacktraceTab, metadataTab];
}
