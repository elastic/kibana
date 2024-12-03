/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DATA_STREAM_TITLE_REQUIRED = i18n.translate(
  'xpack.integrationAssistant.celFlyout.step.celInput.dataStreamTitleRequired',
  {
    defaultMessage: 'This field is mandatory',
  }
);

export const OPEN_API_UPLOAD_INSTRUCTIONS = i18n.translate(
  'xpack.integrationAssistant.celFlyout.step.celInput.uploadInstructions',
  {
    defaultMessage:
      "Upload an OpenAPI spec file to generate a configuration for the CEL input. This is typically found in vendor's API reference documentation.",
  }
);

export const ANALYZING = i18n.translate(
  'xpack.integrationAssistant.celFlyout.step.celInput.analyzing',
  {
    defaultMessage: 'Analyzing',
  }
);

export const CEL_INPUT_TITLE = i18n.translate(
  'xpack.integrationAssistant.celFlyout.step.celInput.celInputTitle',
  {
    defaultMessage: 'Generate CEL input configuration',
  }
);
export const CEL_INPUT_DESCRIPTION = i18n.translate(
  'xpack.integrationAssistant.celFlyout.step.celInput.celInputDescription',
  {
    defaultMessage: 'Upload an OpenAPI spec file to generate a configuration for the CEL input',
  }
);

export const API_DEFINITION_TITLE = i18n.translate(
  'xpack.integrationAssistant.celFlyout.step.celInput.apiDefinition.title',
  {
    defaultMessage: 'OpenAPI Specification',
  }
);

export const API_DEFINITION_DESCRIPTION = i18n.translate(
  'xpack.integrationAssistant.celFlyout.step.celInput.apiDefinition.description',
  {
    defaultMessage: 'Drag and drop a file or browse files.',
  }
);

export const API_DEFINITION_DESCRIPTION_2 = i18n.translate(
  'xpack.integrationAssistant.celFlyout.step.celInput.apiDefinition.description2',
  {
    defaultMessage: 'OpenAPI specification',
  }
);

export const API_DEFINITION_ERROR = {
  CAN_NOT_READ: i18n.translate(
    'xpack.integrationAssistant.celFlyout.step.celInput.openapiSpec.errorCanNotRead',
    {
      defaultMessage: 'Failed to read the uploaded file',
    }
  ),
  INVALID_OAS: i18n.translate(
    'xpack.integrationAssistant.celFlyout.step.celInput.openapiSpec.errorInvalidFormat',
    {
      defaultMessage: 'Uploaded file is not a valid OpenApi spec file',
    }
  ),
  CAN_NOT_READ_WITH_REASON: (reason: string) =>
    i18n.translate(
      'xpack.integrationAssistant.celFlyout.step.celInput.openapiSpec.errorCanNotReadWithReason',
      {
        values: { reason },
        defaultMessage: 'An error occurred when reading spec file: {reason}',
      }
    ),
  TOO_LARGE_TO_PARSE: i18n.translate(
    'xpack.integrationAssistant.celFlyout.step.celInput.openapiSpec.errorTooLargeToParse',
    {
      defaultMessage: 'This spec file is too large to parse',
    }
  ),
};

export const PROGRESS_CEL_INPUT_GRAPH = i18n.translate(
  'xpack.integrationAssistant.celFlyout.step.celInput.generating',
  {
    defaultMessage: 'Analyzing the uploaded API specification',
  }
);

export const GENERATION_ERROR = i18n.translate(
  'xpack.integrationAssistant.celFlyout.step.celInput.generationError',
  {
    defaultMessage: 'An error occurred during API analysis',
  }
);

export const RETRY = i18n.translate(
  'xpack.integrationAssistant.celFlyout.step.celInput.retryButtonLabel',
  {
    defaultMessage: 'Retry',
  }
);
