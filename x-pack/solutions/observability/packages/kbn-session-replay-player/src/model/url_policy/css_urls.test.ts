/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUrlAllowance } from './allowed_urls';
import { neutralizeCss } from './css_urls';

const allowance = createUrlAllowance(['https://cdn.shop.example']);
const neutralize = (css: string) => neutralizeCss(css, allowance);

describe('neutralizeCss', () => {
  it('leaves CSS without fetching tokens untouched', () => {
    const css = '.a:hover{color:red}.md\\:flex{display:flex}';

    expect(neutralize(css)).toBe(css);
  });

  it.each([
    ['unquoted', '.a{background:url(https://evil.example/x.png)}'],
    ['double quoted', '.a{background:url("https://evil.example/x.png")}'],
    ['single quoted', ".a{background:url('https://evil.example/x.png')}"],
    ['spaced', '.a{background:url(  https://evil.example/x.png  )}'],
    ['uppercase', '.a{background:URL(https://evil.example/x.png)}'],
    ['relative', '.a{background:url(/x.png)}'],
    ['protocol-relative', '.a{background:url(//evil.example/x.png)}'],
    ['a src() function', '.a{content:src("https://evil.example/x.png")}'],
  ])('neutralises a remote %s url', (_name, css) => {
    const result = neutralize(css);

    expect(result).toContain('none');
    expect(result).not.toMatch(/evil\.example|\/x\.png/);
  });

  it('keeps allowed urls', () => {
    const css =
      '.a{background:url(https://cdn.shop.example/x.png)}.b{background:url(data:image/png;base64,AAAA)}';

    expect(neutralize(css)).toBe(css);
  });

  it('neutralises only the disallowed url among several', () => {
    const result = neutralize(
      '.a{background:url(https://cdn.shop.example/ok.png),url(https://evil.example/bad.png)}'
    );

    expect(result).toContain('https://cdn.shop.example/ok.png');
    expect(result).not.toContain('evil.example');
  });

  it.each([
    ['url form', '@import url(https://evil.example/a.css);.a{color:red}'],
    ['quoted form', '@import "https://evil.example/a.css";.a{color:red}'],
    ['single quoted form', "@import 'https://evil.example/a.css' screen;.a{color:red}"],
  ])('removes @import in the %s and keeps the rest', (_name, css) => {
    const result = neutralize(css);

    expect(result).not.toContain('evil.example');
    expect(result).toContain('.a{color:red}');
  });

  it('removes image-set() calls entirely', () => {
    const result = neutralize('.a{background:image-set("https://evil.example/a.png" 1x)}');

    expect(result).toBe('.a{background:none}');
  });

  it('keeps font-face rules valid but without the remote source', () => {
    const result = neutralize(
      '@font-face{font-family:x;src:url(https://evil.example/f.woff2) format("woff2")}'
    );

    expect(result).not.toContain('evil.example');
    expect(result).toContain('@font-face');
  });

  describe('escape sequences hiding a fetching token', () => {
    it.each([
      ['an escaped u', '.a{background:\\75rl(https://evil.example/x.png)}'],
      ['an escaped r', '.a{background:u\\72l(https://evil.example/x.png)}'],
      ['an escaped import keyword', '@\\69mport url(https://evil.example/a.css);'],
      [
        'a hidden token beside a visible allowed one',
        '.a{background:url(data:,x)}.b{background:\\75rl(https://evil.example/x.png)}',
      ],
    ])('drops the whole string for %s', (_name, css) => {
      expect(neutralize(css)).toBe('');
    });

    it('keeps escaped selectors when there is no hidden fetching token', () => {
      const css = '.sm\\:p-4{padding:1rem}';

      expect(neutralize(css)).toBe(css);
    });
  });
});
