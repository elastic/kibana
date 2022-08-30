/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Number of characters to display for each tag before truncation
export const MAX_TAG_DISPLAY_LENGTH = 20;

export function truncateTag(tag: string) {
  return tag.length > MAX_TAG_DISPLAY_LENGTH
    ? `${tag.substring(0, MAX_TAG_DISPLAY_LENGTH)}...`
    : tag;
}
