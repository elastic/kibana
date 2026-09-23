/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKqlFieldNamesFromExpression } from '@kbn/es-query';
import { EVENT_OUTCOME } from '../../../../../common/es_fields/apm';

// The operations query in `getTopDependencyOperations` runs against span or
// service-destination-metric documents only. Those documents carry `span.*`
// fields and `event.outcome`, so any KQL clause referencing another field
// (e.g. `url.full`, `transaction.name`) matches zero documents and silently
// returns an empty operations list. See https://github.com/elastic/kibana/issues/170210.
const SUPPORTED_FIELD_PREFIXES = ['span.'] as const;
const SUPPORTED_FIELDS = [EVENT_OUTCOME] as const;

function isSupportedField(fieldName: string): boolean {
  return (
    SUPPORTED_FIELDS.includes(fieldName) ||
    SUPPORTED_FIELD_PREFIXES.some((prefix) => fieldName.startsWith(prefix))
  );
}

/**
 * Returns the list of fields referenced in a KQL expression that the operations
 * query cannot filter on. Returns an empty array when the expression is empty or
 * only references supported fields.
 */
export function getUnsupportedKueryFields(kuery: string): string[] {
  if (!kuery) {
    return [];
  }

  let fieldNames: string[];
  try {
    fieldNames = getKqlFieldNamesFromExpression(kuery);
  } catch {
    // Invalid KQL is handled elsewhere; don't surface a false warning here.
    return [];
  }

  const unsupported = fieldNames.filter((fieldName) => !isSupportedField(fieldName));

  // Deduplicate while preserving order.
  return Array.from(new Set(unsupported));
}
