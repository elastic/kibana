/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// spec yaml `spec` key from https://raw.githubusercontent.com/elastic/package-spec/master/versions/1/data_stream/manifest.spec.yml
// to json: e.g. https://transform.tools/yaml-to-json)
// json schema to TS: e.g. https://transform.tools/json-schema-to-typescript

/**
 * Input variables.
 */
export type PackageSpecDataStreamVars = Array<{
  /**
   * Variable name.
   */
  name: string;
  /**
   * Data type of variable.
   */
  type: 'integer' | 'bool' | 'password' | 'text' | 'yaml';
  /**
   * Title of variable.
   */
  title?: string;
  /**
   * Short description of variable.
   */
  description?: string;
  /**
   * Can variable contain multiple values?
   */
  multi?: boolean;
  /**
   * Is variable required?
   */
  required?: boolean;
  /**
   * Should this variable be shown to the user by default?
   */
  show_user?: boolean;
  /**
   * Default value(s) for variable
   */
  // default?: string[] | string[] | string[] | string[] | null;
  default?: Array<string | number | boolean | null> | null;
}>;

export interface PackageSpecDataStreamManifest {
  /**
   * Name of data set.
   */
  dataset?: string;
  /**
   * Title of data stream.
   */
  title: string;
  /**
   * Stability of data stream.
   */
  release?: 'experimental' | 'beta';
  /**
   * Type of data stream
   */
  type?: 'metrics' | 'logs' | 'traces';
  /**
   * Streams offered by data stream.
   */
  streams?: Array<{
    input: string;
    title: string;
    description: string;
    /**
     * Path to Elasticsearch index template for stream.
     */
    template_path?: string;
    vars?: PackageSpecDataStreamVars;
    /**
     * Is stream enabled?
     */
    enabled?: boolean;
  }>;
  /**
   * Elasticsearch asset definitions
   */
  elasticsearch?: {
    /**
     * Index template definition
     */
    index_template?: {
      /**
       * Settings section of index template
       */
      settings?: {
        [k: string]: unknown;
      };
      /**
       * Mappings section of index template
       */
      mappings?: {
        [k: string]: unknown;
      };
      /**
       * Elasticsearch ingest pipeline settings
       */
      ingest_pipeline?: {
        /**
         * Ingest pipeline name
         */
        name: string;
      };
    };
  };
}
