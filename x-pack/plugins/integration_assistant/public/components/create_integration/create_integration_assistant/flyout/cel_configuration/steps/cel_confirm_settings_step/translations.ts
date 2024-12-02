/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ANALYZING = i18n.translate(
  'xpack.integrationAssistant.step.celApiAnalysis.analyzing',
  {
    defaultMessage: 'Analyzing',
  }
);

export const CONFIRM_ENDPOINT = i18n.translate(
  'xpack.integrationAssistant.step.celInput.confirmEndpoint',
  {
    defaultMessage: 'Choose API endpoint',
  }
);
export const CONFIRM_ENDPOINT_DESCRIPTION = i18n.translate(
  'xpack.integrationAssistant.step.celInput.confirmEndpointDescription',
  {
    defaultMessage: 'Recommended API endpoints (chosen from your spec file)',
  }
);

export const CONFIRM_AUTH = i18n.translate('xpack.integrationAssistant.step.celInput.confirmAuth', {
  defaultMessage: 'Choose Authentication method',
});
export const CONFIRM_AUTH_DESCRIPTION = i18n.translate(
  'xpack.integrationAssistant.step.celInput.confirmAuthDescription',
  {
    defaultMessage: 'Please select the authentication method for the selected API endpoint.',
  }
);

export const AUTH_DOES_NOT_ALIGN = i18n.translate(
  'xpack.integrationAssistant.step.celConfirm.authDoesNotAlign',
  {
    defaultMessage: 'This method does not align with your spec file',
  }
);

export const PROGRESS_CEL_INPUT_GRAPH = i18n.translate(
  'xpack.integrationAssistant.step.celInput.progress.relatedGraph',
  {
    defaultMessage: 'Generating CEL input configuration',
  }
);

export const GENERATION_ERROR = i18n.translate(
  'xpack.integrationAssistant.step.celInput.generationError',
  {
    defaultMessage: 'An error occurred during: CEL input generation',
  }
);

export const RETRY = i18n.translate('xpack.integrationAssistant.step.celInput.retryButtonLabel', {
  defaultMessage: 'Retry',
});
