/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A hit from the response to an Elasticsearch multi-search request,
 * which returns the results of multiple searches in a single request.
 *
 * Search hits may contain the following properties that may be present in
 * knowledge base documents:
 *
 * 1) the `metadata` property, an object that may have the following properties:
 * - `kbResource`: The name of the Knowledge Base resource that the document belongs to, e.g. `esql`
 * - `required`: A boolean indicating whether the document is required for searches on the `kbResource` topic
 * - `source`: Describes the origin of the document, sometimes a file path via a LangChain DirectoryLoader
 * 2) the `text` property, a string containing the text of the document
 * 3) the `vector` property, containing the document's embeddings
 */
export interface MsearchKbHit {
  _id?: string;
  _ignored?: string[];
  _index?: string;
  _score?: number;
  _source?: {
    metadata?: {
      kbResource?: string;
      required?: boolean;
      source?: string;
    };
    text?: string;
    vector?: {
      tokens?: Record<string, number>;
    };
  };
}

/**
 * A Response from an Elasticsearch multi-search request, which returns the
 * results of multiple searches in a single request.
 */
export interface MsearchResponse {
  hits?: {
    hits?: MsearchKbHit[];
  };
}
