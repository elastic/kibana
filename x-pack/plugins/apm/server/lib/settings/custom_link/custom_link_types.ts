/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CustomLinkES } from './create_custom_link_index';

interface Filter {
  key: string;
  value: string[];
}

export interface CustomLink {
  id?: string;
  '@timestamp'?: number;
  label: string;
  url: string;
  filters: Filter[];
}

export function convertTo(customLinkES: CustomLinkES[]): CustomLink[] {
  return customLinkES.map(
    ({ id, label, url, '@timestamp': timestamp, ...filters }) => ({
      id,
      '@timestamp': timestamp,
      label,
      url,
      filters: Object.entries(filters).map(([key, value]) => ({ key, value }))
    })
  );
}
