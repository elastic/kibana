/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { APMError } from '../../../../../typings/es_schemas/ui/apm_error';

export interface ErrorTab {
  key: 'log_stacktrace' | 'exception_stacktrace' | 'metadata';
  label: string;
}

export const logStacktraceTab: ErrorTab = {
  key: 'log_stacktrace',
  label: i18n.translate('xpack.apm.propertiesTable.tabs.logStacktraceLabel', {
    defaultMessage: 'Log stack trace',
  }),
};

export const exceptionStacktraceTab: ErrorTab = {
  key: 'exception_stacktrace',
  label: i18n.translate(
    'xpack.apm.propertiesTable.tabs.exceptionStacktraceLabel',
    {
      defaultMessage: 'Exception stack trace',
    }
  ),
};

export const metadataTab: ErrorTab = {
  key: 'metadata',
  label: i18n.translate('xpack.apm.propertiesTable.tabs.metadataLabel', {
    defaultMessage: 'Metadata',
  }),
};

export function getTabs(error: APMError) {
  const hasLogStacktrace = !isEmpty(error.error.log?.stacktrace);
  return [
    ...(hasLogStacktrace ? [logStacktraceTab] : []),
    exceptionStacktraceTab,
    metadataTab,
  ];
}
