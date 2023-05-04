/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorServerSideDefinition } from '../../../../../../common/connectors/connectors';

export interface ConnectorClientSideDefinition {
  docsUrl?: string;
  externalAuthDocsUrl?: string;
  externalDocsUrl: string;
  icon: string;
}

export type ConnectorDefinition = ConnectorClientSideDefinition & ConnectorServerSideDefinition;
