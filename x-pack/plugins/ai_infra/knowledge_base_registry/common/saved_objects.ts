/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Interface describing the raw attributes of the KB Entry SO type.
 * Contains more fields than the mappings, which only list
 * indexed fields.
 */
export interface KnowledgeBaseEntryAttributes {
  name: string;
  description?: string;
  source: KnowledgeBaseEntrySource;
  created_by: KnowledgeBaseEntryCreatedBy;
}

interface KnowledgeBaseEntryIndexSource {
  type: 'index';
  index_name: string;
  syntactic_fields: string[];
  semantic_fields: string[];
}

type KnowledgeBaseEntrySource = KnowledgeBaseEntryIndexSource;

interface KnowledgeBaseEntryCreatedByPackage {
  type: 'package';
  packageName: string;
  version: string;
}

type KnowledgeBaseEntryCreatedBy = KnowledgeBaseEntryCreatedByPackage;
