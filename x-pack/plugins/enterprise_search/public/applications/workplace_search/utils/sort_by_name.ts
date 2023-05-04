/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface WithName {
  name: string;
}

export function sortByName<T extends WithName>(nameItems: T[]): T[] {
  return [...nameItems].sort((a, b) => a.name.localeCompare(b.name));
}
