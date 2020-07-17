/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { ISource } from './source';

export type SourceRegistryEntry = {
  ConstructorFunction: new (
    sourceDescriptor: any, // this is the source-descriptor that corresponds specifically to the particular ISource instance
    inspectorAdapters?: object
  ) => ISource;
  type: string;
};

const registry: SourceRegistryEntry[] = [];

export function registerSource(entry: SourceRegistryEntry) {
  const sourceTypeExists = registry.some(({ type }: SourceRegistryEntry) => {
    return entry.type === type;
  });
  if (sourceTypeExists) {
    throw new Error(
      `Unable to register source type ${entry.type}. ${entry.type} has already been registered`
    );
  }
  registry.push(entry);
}

export function getSourceByType(sourceType: string): SourceRegistryEntry | undefined {
  return registry.find((source: SourceRegistryEntry) => source.type === sourceType);
}
