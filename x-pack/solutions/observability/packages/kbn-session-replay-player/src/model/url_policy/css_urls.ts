/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UrlAllowance } from './allowed_urls';

const CSS_ESCAPE = /\\([0-9a-fA-F]{1,6})\s?|\\([\s\S])/g;
const FETCH_TOKEN = /@import|url\(|image-set\(|(?:^|[^\w-])src\(/gi;
const URL_FUNCTION = /(url|src)\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^)"']*))\s*\)/gi;
const IMPORT_RULE = /@import\s+(?:url\([^)]*\)|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')[^;{}]*;?/gi;
const IMAGE_SET = /(?:-webkit-)?image-set\((?:[^()]|\([^()]*\))*\)/gi;

const unescapeCss = (css: string): string =>
  css.replace(CSS_ESCAPE, (_match, hex: string | undefined, literal: string | undefined) => {
    if (hex !== undefined) {
      const codePoint = parseInt(hex, 16);
      return codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : '';
    }
    return literal ?? '';
  });

const countFetchTokens = (css: string): number => css.match(FETCH_TOKEN)?.length ?? 0;

/**
 * Removes the parts of a CSS string that fetch remote content: `@import`, `image-set()`, and
 * `url()` / `src()` whose target is not allowed. Allowed URLs are kept. If escape sequences hide a
 * fetching token from the rewrite above, the whole string is dropped.
 */
export const neutralizeCss = (css: string, allowance: UrlAllowance): string => {
  if (countFetchTokens(css) === 0 && !css.includes('\\')) {
    return css;
  }

  const rewritten = css
    .replace(IMPORT_RULE, '')
    .replace(IMAGE_SET, 'none')
    .replace(
      URL_FUNCTION,
      (
        match: string,
        _name: string,
        doubleQuoted: string | undefined,
        singleQuoted: string | undefined,
        bare: string | undefined
      ) => {
        const target = unescapeCss(doubleQuoted ?? singleQuoted ?? bare ?? '');
        return allowance.isAllowedImageUrl(target) ? match : 'none';
      }
    );

  return countFetchTokens(unescapeCss(rewritten)) > countFetchTokens(rewritten) ? '' : rewritten;
};
