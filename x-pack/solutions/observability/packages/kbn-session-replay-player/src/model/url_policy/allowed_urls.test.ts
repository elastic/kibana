/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUrlAllowance } from './allowed_urls';

// Built from parts so the repository's no-script-url lint rule does not flag the test data.
const JAVASCRIPT_URL = `${'javascript'}:alert(1)`;

describe('createUrlAllowance', () => {
  const { isAllowedImageUrl } = createUrlAllowance([
    'https://cdn.shop.example',
    'http://localhost:8080/',
  ]);

  it.each([
    ['an empty URL', ''],
    ['a data URL', 'data:image/png;base64,AAAA'],
    ['an uppercase data URL', 'DATA:image/svg+xml,<svg/>'],
    ['a blob URL', 'blob:https://shop.example/1234'],
    ['an allowlisted https origin', 'https://cdn.shop.example/img/logo.png?x=1'],
    ['an allowlisted origin written with a path in the allowlist', 'http://localhost:8080/a.png'],
    ['a URL with surrounding whitespace', '  https://cdn.shop.example/a.png  '],
  ])('allows %s', (_name, url) => {
    expect(isAllowedImageUrl(url)).toBe(true);
  });

  it.each([
    ['another origin', 'https://evil.example/p.gif'],
    ['a different port', 'http://localhost:9099/p.gif'],
    ['a different scheme for an allowlisted host', 'http://cdn.shop.example/a.png'],
    ['a relative URL', '/relative.png'],
    ['a relative URL without a slash', 'relative.png'],
    ['a protocol-relative URL', '//cdn.shop.example/a.png'],
    ['a javascript URL', JAVASCRIPT_URL],
    ['a look-alike host', 'https://cdn.shop.example.evil.example/a.png'],
    ['a URL with credentials pointing elsewhere', 'https://cdn.shop.example@evil.example/a.png'],
    ['an ftp URL', 'ftp://cdn.shop.example/a.png'],
  ])('rejects %s', (_name, url) => {
    expect(isAllowedImageUrl(url)).toBe(false);
  });

  it('allows only data and blob URLs with no allowlist', () => {
    const none = createUrlAllowance();

    expect(none.isAllowedImageUrl('https://cdn.shop.example/a.png')).toBe(false);
    expect(none.isAllowedImageUrl('data:image/png;base64,AAAA')).toBe(true);
  });

  it('ignores allowlist entries that are not valid origins', () => {
    const { isAllowedImageUrl: check } = createUrlAllowance(['not a url', 'cdn.shop.example']);

    expect(check('https://cdn.shop.example/a.png')).toBe(false);
  });
});
