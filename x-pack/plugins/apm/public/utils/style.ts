/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const unit = 16;

export function truncate(width: string | number) {
  return `
      max-width: ${typeof width === 'string' ? width : `${width}px`};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
}
