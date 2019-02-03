/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DocumentAnalysisSettings,
  DocumentIndexName,
  DocumentIndexNamePrefix,
  DocumentSchema,
  DocumentSearchIndexWithScope,
} from './document';

export const RepositorySchema = DocumentSchema;
export const RepositoryAnalysisSettings = DocumentAnalysisSettings;
export const RepositoryIndexNamePrefix = DocumentIndexNamePrefix;
export const RepositoryIndexName = DocumentIndexName;
export const RepositorySearchIndexWithScope = DocumentSearchIndexWithScope;

// The field name of repository object nested in the Document index.
export const RepositoryReservedField = 'repository';
// The field name of repository git status object nested in the Document index.
export const RepositoryGitStatusReservedField = 'repository_git_status';
// The field name of repository delete status object nested in the Document index.
export const RepositoryDeleteStatusReservedField = 'repository_delete_status';
// The field name of repository lsp index status object nested in the Document index.
export const RepositoryLspIndexStatusReservedField = 'repository_lsp_index_status';
// The field name of repository config object nested in the Document index.
export const RepositoryConfigReservedField = 'repository_config';
// The field name of repository config object nested in the Document index.
export const RepositoryRandomPathReservedField = 'repository_random_path';

export const ALL_RESERVED = [
  RepositoryReservedField,
  RepositoryGitStatusReservedField,
  RepositoryDeleteStatusReservedField,
  RepositoryLspIndexStatusReservedField,
  RepositoryConfigReservedField,
  RepositoryRandomPathReservedField,
];
