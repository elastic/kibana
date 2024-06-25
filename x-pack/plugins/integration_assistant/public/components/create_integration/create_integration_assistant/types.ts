/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InputType } from '../../../../common';

// TODO: find a better home for this type
export type { AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';

export interface IntegrationSettings {
  title?: string;
  description?: string;
  logo?: string;
  name?: string;
  dataStreamTitle?: string;
  dataStreamDescription?: string;
  dataStreamName?: string;
  inputType?: InputType;
  logsSampleParsed?: string[];
}
