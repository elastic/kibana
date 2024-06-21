/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INTEGRATION_NAME_TITLE = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.integrationNameTitle',
  {
    defaultMessage: 'Define package name',
  }
);
export const INTEGRATION_NAME_DESCRIPTION = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.integrationNameDescription',
  {
    defaultMessage:
      "The package name is used to refer to the integration in Elastic's ingest pipeline",
  }
);
export const DATA_STREAM_TITLE = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.dataStreamTitle',
  {
    defaultMessage: 'Define data stream and upload logs',
  }
);
export const DATA_STREAM_DESCRIPTION = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.dataStreamDescription',
  {
    defaultMessage:
      'Logs are analyzed to automatically map ECS fields and help create the ingestion pipeline',
  }
);

export const INTEGRATION_NAME_LABEL = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.integrationName.label',
  {
    defaultMessage: 'Integration package name',
  }
);
export const NO_SPACES_HELP = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.noSpacesHelpText',
  {
    defaultMessage: 'Name can only contain lowercase letters, numbers, and underscore (_)',
  }
);
export const PACKAGE_NAMES_FETCH_ERROR = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.packageNamesFetchError',
  {
    defaultMessage: 'Error fetching package names',
  }
);
export const NAME_ALREADY_EXISTS_ERROR = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.nameAlreadyExistsError',
  {
    defaultMessage: 'This integration name is already in use. Please choose a different name.',
  }
);

export const DATA_STREAM_TITLE_LABEL = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.dataStreamTitle.label',
  {
    defaultMessage: 'Data stream title',
  }
);

export const DATA_STREAM_DESCRIPTION_LABEL = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.dataStreamDescription.label',
  {
    defaultMessage: 'Data stream description',
  }
);

export const DATA_STREAM_NAME_LABEL = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.dataStreamName.label',
  {
    defaultMessage: 'Data stream name',
  }
);

export const DATA_COLLECTION_METHOD_LABEL = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.dataCollectionMethod.label',
  {
    defaultMessage: 'Data collection method',
  }
);

export const LOGS_SAMPLE_LABEL = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.logsSample.label',
  {
    defaultMessage: 'Logs',
  }
);

export const LOGS_SAMPLE_WARNING = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.logsSample.warning',
  {
    defaultMessage:
      'Please note that this data will be analyzed by a third-party AI tool. Ensure that you comply with privacy and security guidelines when selecting data.',
  }
);

export const LOGS_SAMPLE_DESCRIPTION = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.logsSample.description',
  {
    defaultMessage: 'Drag and drop a file or Browse files.',
  }
);
export const LOGS_SAMPLE_DESCRIPTION_2 = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.logsSample.description2',
  {
    defaultMessage: 'JSON/NDJSON format',
  }
);
export const LOGS_SAMPLE_TRUNCATED = (maxRows: number) =>
  i18n.translate('xpack.integrationAssistant.step.dataStream.logsSample.truncatedWarning', {
    values: { maxRows },
    defaultMessage: `The logs sample has been truncated to {maxRows} rows.`,
  });
export const LOGS_SAMPLE_ERROR = {
  CAN_NOT_READ: i18n.translate(
    'xpack.integrationAssistant.step.dataStream.logsSample.errorCanNotRead',
    {
      defaultMessage: 'Failed to read the logs sample file',
    }
  ),
  FORMAT: (fileType: string) =>
    i18n.translate('xpack.integrationAssistant.step.dataStream.logsSample.errorFormat', {
      values: { fileType },
      defaultMessage: 'The logs sample file has not a valid {fileType} format',
    }),
  NOT_ARRAY: i18n.translate('xpack.integrationAssistant.step.dataStream.logsSample.errorNotArray', {
    defaultMessage: 'The logs sample file is not an array',
  }),
  EMPTY: i18n.translate('xpack.integrationAssistant.step.dataStream.logsSample.errorEmpty', {
    defaultMessage: 'The logs sample file is empty',
  }),
  NOT_OBJECT: i18n.translate(
    'xpack.integrationAssistant.step.dataStream.logsSample.errorNotObject',
    {
      defaultMessage: 'The logs sample file contains non-object entries',
    }
  ),
};

export const ANALYZING = i18n.translate('xpack.integrationAssistant.step.dataStream.analyzing', {
  defaultMessage: 'Analyzing',
});
export const PROGRESS_ECS_MAPPING = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.progress.ecsMapping',
  {
    defaultMessage: 'Mapping ECS fields',
  }
);
export const PROGRESS_CATEGORIZATION = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.progress.categorization',
  {
    defaultMessage: 'Adding categorization',
  }
);
export const PROGRESS_RELATED_GRAPH = i18n.translate(
  'xpack.integrationAssistant.step.dataStream.progress.relatedGraph',
  {
    defaultMessage: 'Generating related fields',
  }
);
