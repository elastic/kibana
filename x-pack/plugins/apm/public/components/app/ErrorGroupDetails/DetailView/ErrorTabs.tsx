/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { idx } from '../../../../../common/idx';
import { APMError } from '../../../../../typings/es_schemas/ui/APMError';

export type ErrorTab = MetadataTab | ExceptionTab | LogTab;

interface LogTab {
  key: 'log_stacktrace';
  label: string;
}

export const logStacktraceTab: LogTab = {
  key: 'log_stacktrace',
  label: i18n.translate('xpack.apm.propertiesTable.tabs.logStacktraceLabel', {
    defaultMessage: 'Log stacktrace'
  })
};

interface ExceptionTab {
  key: 'exception_stacktrace';
  label: string;
}

export const exceptionStacktraceTab: ExceptionTab = {
  key: 'exception_stacktrace',
  label: i18n.translate(
    'xpack.apm.propertiesTable.tabs.exceptionStacktraceLabel',
    {
      defaultMessage: 'Exception stacktrace'
    }
  )
};

interface MetadataTab {
  key: 'metadata';
  label: string;
}

export const metadataTab: MetadataTab = {
  key: 'metadata',
  label: i18n.translate('xpack.apm.propertiesTable.tabs.metadataLabel', {
    defaultMessage: 'Metadata'
  })
};

export function getTabs(error: APMError) {
  const hasLogStacktrace = !isEmpty(idx(error, _ => _.error.log.stacktrace));
  return [
    ...(hasLogStacktrace ? [logStacktraceTab] : []),
    exceptionStacktraceTab,
    metadataTab
  ];
}
