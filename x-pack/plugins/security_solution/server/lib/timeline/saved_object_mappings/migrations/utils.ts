/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'kibana/server';

export function createReference(
  id: string | null | undefined,
  name: string,
  type: string
): SavedObjectReference[] {
  return id != null ? [{ id, name, type }] : [];
}
