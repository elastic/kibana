/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface UrlAllowance {
  /**
   * Whether a URL may be fetched as a subresource that cannot run code (an image, media, a CSS
   * `url()`). Relative and protocol-relative URLs are never allowed: they would resolve against the
   * embedding page, which is Kibana.
   */
  isAllowedImageUrl: (url: string) => boolean;
}

const normalizeOrigins = (origins: readonly string[]): Set<string> => {
  const normalized = new Set<string>();
  for (const origin of origins) {
    try {
      normalized.add(new URL(origin).origin);
    } catch {
      // An origin that does not parse allows nothing.
    }
  }
  return normalized;
};

export const createUrlAllowance = (allowedOrigins: readonly string[] = []): UrlAllowance => {
  const origins = normalizeOrigins(allowedOrigins);

  return {
    isAllowedImageUrl: (url) => {
      const trimmed = url.trim();
      if (trimmed === '' || /^(data|blob):/i.test(trimmed)) {
        return true;
      }
      try {
        const parsed = new URL(trimmed);
        return (
          (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
          origins.has(parsed.origin)
        );
      } catch {
        return false;
      }
    },
  };
};
