/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IdentifierType } from '../../../../common/entity_analytics/risk_engine';

export const getFieldForIdentifier = (identifierType: IdentifierType): string =>
  identifierType === 'host' ? 'host.name' : 'user.name';
