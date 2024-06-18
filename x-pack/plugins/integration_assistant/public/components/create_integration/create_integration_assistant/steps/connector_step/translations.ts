/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.integrationAssistant.steps.connector.title', {
  defaultMessage: 'Choose your AI connector',
});

export const DESCRIPTION = i18n.translate(
  'xpack.integrationAssistant.steps.connector.description',
  {
    defaultMessage: 'Select an AI connector to help you create your custom integration',
  }
);

export const TITLE_NO_CONNECTORS = i18n.translate(
  'xpack.integrationAssistant.steps.connector.titleNoConnectors',
  {
    defaultMessage: 'Create an AI connector',
  }
);

export const DESCRIPTION_NO_CONNECTORS = i18n.translate(
  'xpack.integrationAssistant.steps.connector.descriptionNoConnectors',
  {
    defaultMessage: 'First, set up a generative AI connector',
  }
);

export const CREATE_CONNECTOR = i18n.translate(
  'xpack.integrationAssistant.steps.connector.createConnectorLabel',
  {
    defaultMessage: 'Create new connector',
  }
);
