/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum FieldType {
  HTML = 'html',
  URL = 'url',
}

export enum ExtractionFilter {
  BEGINS = 'begins',
  ENDS = 'ends',
  CONTAINS = 'contains',
  REGEX = 'regex',
}

export enum ContentFrom {
  FIXED = 'fixed',
  EXTRACTED = 'extracted',
}

export enum MultipleObjectsHandling {
  ARRAY = 'array',
  STRING = 'string',
}

export interface ExtractionRuleFieldRule {
  content_from: {
    value: string | null;
    value_type: ContentFrom;
  };
  field_name: string;
  multiple_objects_handling: MultipleObjectsHandling;
  selector: string;
  source_type: FieldType;
}

export interface ExtractionRuleBase {
  description: string;
  rules: ExtractionRuleFieldRule[];
  url_filters: Array<{ filter: ExtractionFilter; pattern: string }>;
}

export type ExtractionRule = ExtractionRuleBase & {
  created_at: string;
  domain_id: string;
  edited_by: string;
  id: string;
  updated_at: string;
};
