/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Values are wrapped in double quotes and escaped with `escapeQuotes`, so that service names
 * containing KQL-significant characters (`:`, whitespace, `and`/`or`/`not`, ...) stay parseable.
 */

import { escapeQuotes } from '@kbn/es-query';
import { SERVICE_NAME } from '../es_fields/apm';

/** Builds a KQL expression scoping a query to a single service name. */
export const getServiceNameKuery = (serviceName: string): string =>
  `${SERVICE_NAME}: "${escapeQuotes(serviceName)}"`;
