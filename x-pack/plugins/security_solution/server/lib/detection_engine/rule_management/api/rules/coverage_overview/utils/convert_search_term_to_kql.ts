/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '@kbn/es-query';

const SEARCHABLE_RULE_ATTRIBUTES = [
  'alert.attributes.name',
  'alert.attributes.params.index',
  'alert.attributes.params.threat.tactic.id',
  'alert.attributes.params.threat.tactic.name',
  'alert.attributes.params.threat.technique.id',
  'alert.attributes.params.threat.technique.name',
  'alert.attributes.params.threat.technique.subtechnique.id',
  'alert.attributes.params.threat.technique.subtechnique.name',
];

export function convertSearchTermToKQL(
  searchTerm: string,
  attributes = SEARCHABLE_RULE_ATTRIBUTES
): string {
  return attributes.map((param) => `${param}: "${escapeKuery(searchTerm)}"`).join(' OR ');
}
