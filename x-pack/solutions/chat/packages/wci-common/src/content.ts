/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ContentRefSourceType {
  /**
   * Content coming from an integration source, in
   * which case the `sourceId` of the ContentRef will be the id of the integration
   */
  integration = 'integration',
}

/**
 * Represents a reference to a content
 */
export interface ContentRef {
  /**
   * Type of the source
   */
  sourceType: ContentRefSourceType;
  /**
   * Id of the source
   */
  sourceId: string;
  /**
   * Unique ID this content (for this sourceId).
   */
  contentId: string;
}

export const contentRefBuilder =
  ({ sourceId, sourceType }: { sourceType: ContentRefSourceType; sourceId: string }) =>
  (contentId: string): ContentRef => ({ sourceId, sourceType, contentId });
