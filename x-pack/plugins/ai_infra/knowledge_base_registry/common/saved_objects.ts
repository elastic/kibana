/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents the source of the KB entry, where the data it resolved from
 *
 * Only possible subtype for now is `index`
 */
export type KnowledgeBaseEntrySource = KnowledgeBaseEntryIndexSource;

export interface KnowledgeBaseEntryIndexSource {
  type: 'index';
  index_name: string;
  syntactic_fields: string[];
  semantic_fields: string[];
}

/**
 * Represents how the package was installed
 *
 * Only possible subtype for now is `package`
 */
export type KnowledgeBaseEntryInstalledBy = KnowledgeBaseEntryInstalledByPackage;

interface KnowledgeBaseEntryInstalledByPackage {
  type: 'package';
  packageName: string;
  version: string;
}
