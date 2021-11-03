/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Properties for the LegacyUrlConflict component.
 */
export interface LegacyUrlConflictProps {
  /**
   * The string that is used to describe the object in the callout, e.g., _There is a legacy URL for this page that points to a different
   * **object**_.
   *
   * Default value is 'object'.
   */
  objectNoun?: string;
  /**
   * The ID of the object that is currently shown on the page.
   */
  currentObjectId: string;
  /**
   * The ID of the other object that the legacy URL alias points to.
   */
  otherObjectId: string;
  /**
   *  The path within your application to use for the new URL, optionally including `search` and/or `hash` URL components. Do not include
   *  `/app/my-app` or the current base path.
   */
  otherObjectPath: string;
}

/**
 * Properties for the EmbeddableLegacyUrlConflict component.
 */
export interface EmbeddableLegacyUrlConflictProps {
  /**
   * The target type of the legacy URL alias.
   */
  targetType: string;
  /**
   * The source ID of the legacy URL alias.
   */
  sourceId: string;
}
