/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorConfiguration } from '../../../../../../common/types/connectors';

export interface NativeConnector {
  configuration: ConnectorConfiguration;
  docsUrl: string;
  externalAuthDocsUrl?: string;
  externalDocsUrl: string;
  name: string;
  serviceType: string;
}
