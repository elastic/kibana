/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getRealFieldName(fieldName: string) {
  // Return unchanged if field is already namespaced or real
  if (
    fieldName === 'severity_text' ||
    fieldName.startsWith('resource.attributes') ||
    fieldName.startsWith('attributes')
  ) {
    return fieldName;
  }
  if (fieldName === '@timestamp') {
    return fieldName;
  }
  if (fieldName === 'log.level') {
    return 'severity_text';
  }
  if (fieldName === 'host.name') {
    return 'resource.attributes.host.name';
  }
  // Default: prefix with "attributes."
  return `attributes.${fieldName}`;
}
