/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOGS_ANALYSIS_TITLE = i18n.translate(
  'xpack.integrationAssistant.integrationSettings.label.logsAnalysis.title',
  {
    defaultMessage: 'Upload Logs and Define Package',
  }
);
export const LOGS_ANALYSIS_DESCRIPTION = i18n.translate(
  'xpack.integrationAssistant.integrationSettings.label.logsAnalysis.description',
  {
    defaultMessage:
      'Upload the log files you want to analyze. Additionally, specify the data stream and package names for better organization and tracking.',
  }
);

export const NAME_LABEL = i18n.translate(
  'xpack.integrationAssistant.integrationSettings.label.name',
  {
    defaultMessage: 'Integration name',
  }
);

export const DATA_STREAM_NAME_LABEL = i18n.translate(
  'xpack.integrationAssistant.integrationSettings.label.datastreamName',
  {
    defaultMessage: 'Data stream name',
  }
);

export const FORMAT_LABEL = i18n.translate(
  'xpack.integrationAssistant.integrationSettings.label.format',
  {
    defaultMessage: 'Format',
  }
);

export const LOGS_SAMPLE_LABEL = i18n.translate(
  'xpack.integrationAssistant.integrationSettings.label.logsSample',
  {
    defaultMessage: 'Logs sample upload',
  }
);
