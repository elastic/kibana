/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents a definition for an index source.
 *
 * The definition contains all what's necessary for the system to build
 * the MCP tool that will then be used by the LLM to query the data.
 */
export interface IndexSourceDefinition {
  /**
   * ID of the index that is going to be used for this index source
   */
  index: string;
  /**
   * A short description of what the index contains
   */
  description: string;
  /**
   * List of fields that will be used for fulltext search.
   */
  queryFields: IndexSourceQueryFields[];
  /**
   * List of possible filters when querying for the data
   */
  filterFields: IndexSourceFilter[];
  /**
   * List of fields that will be returned as content by the tool
   */
  contentFields: IndexSourceContentFields[];
}

export interface IndexSourceFilter {
  /**
   * The name / path to the field
   * E.g. `content` or `reference.id`
   */
  field: string;
  /**
   * The type of field. Should be the same type as defined in the mappings
   */
  type: string;
  /**
   * A human-readable description for this filter.
   */
  description: string;
  /**
   * If true, the field's top values will be fetched at query time,
   * and added to the description. The parameter will also be restricted
   * to only allow those values
   */
  asEnum: boolean;
}

/**
 * Represents a field that will be used for full-text search.
 */
export interface IndexSourceQueryFields {
  /**
   * The name / path to the field
   * E.g. `content` or `reference.id`
   */
  field: string;
  /**
   * The type of field. Should be the same type as defined in the mappings
   */
  type: string;
}

/**
 * Represents a field that will be used for full-text search.
 */
export interface IndexSourceContentFields {
  /**
   * The name / path to the field
   * E.g. `content` or `reference.id`
   */
  field: string;
  /**
   * The type of field. Should be the same type as defined in the mappings
   */
  type: string;
}
