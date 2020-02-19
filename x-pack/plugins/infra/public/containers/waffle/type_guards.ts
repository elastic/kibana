/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraWaffleMapGroupOfGroups, InfraWaffleMapGroupOfNodes } from '../../lib/lib';

export function isWaffleMapGroupWithNodes(subject: any): subject is InfraWaffleMapGroupOfNodes {
  return subject && subject.nodes != null && Array.isArray(subject.nodes);
}

export function isWaffleMapGroupWithGroups(subject: any): subject is InfraWaffleMapGroupOfGroups {
  return subject && subject.groups != null && Array.isArray(subject.groups);
}
