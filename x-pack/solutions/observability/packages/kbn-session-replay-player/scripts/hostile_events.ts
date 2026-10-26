/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Events assembled by hand to exercise every path by which recorded content can make the player's
 * browser fetch remote content or run code. A real recorder never produces them: they model a
 * hostile writer posting raw replay documents. All hosts use the reserved `.example` domain.
 */

const el = (
  id: number,
  tagName: string,
  attributes: Record<string, unknown> = {},
  childNodes: unknown[] = []
) => ({ type: 2, id, tagName, attributes, childNodes });

const text = (id: number, textContent: string, isStyle = false) => ({
  type: 3,
  id,
  textContent,
  ...(isStyle ? { isStyle: true } : {}),
});

const EVIL = 'https://evil.example';
// Built from parts so the repository's no-script-url lint rule does not flag the test data.
const JAVASCRIPT_HREF = `${'javascript'}:window.parent.__pwned_js = 1`;

export const buildHostileEvents = (t0: number): unknown[] => [
  { type: 4, timestamp: t0, data: { href: `${EVIL}/landing?token=abc`, width: 800, height: 600 } },
  {
    type: 2,
    timestamp: t0 + 1,
    data: {
      initialOffset: { top: 0, left: 0 },
      node: {
        type: 0,
        id: 1,
        compatMode: 'CSS1Compat',
        childNodes: [
          el(2, 'html', { lang: 'en' }, [
            el(3, 'head', {}, [
              el(4, 'style', {}, [
                text(
                  5,
                  `@import url(${EVIL}/import.css);.tracked{background:url(${EVIL}/css-bg.png)}.sm\\:p-4{padding:1rem}`,
                  true
                ),
              ]),
              el(6, 'link', {
                rel: 'stylesheet',
                href: `${EVIL}/link.css`,
                _cssText: `@import "${EVIL}/inlined.css";`,
              }),
              el(7, 'base', { href: `${EVIL}/` }),
            ]),
            el(8, 'body', { background: `${EVIL}/body-bg.png` }, [
              el(9, 'script', {}, [text(10, 'window.parent.__pwned_script = 1')]),
              el(11, 'img', {
                src: `${EVIL}/p.gif?x=1`,
                onerror: 'window.parent.__pwned_onerror = 1',
                width: '10',
                height: '10',
              }),
              el(12, 'img', { src: '/relative-image.png', width: '10', height: '10' }),
              el(13, 'img', { srcset: `${EVIL}/srcset.png 2x`, width: '10', height: '10' }),
              el(14, 'div', {
                class: 'tracked',
                style: `background-image:url(${EVIL}/inline.png);width:20px;height:20px`,
              }),
              el(15, 'a', { id: 'jslink', href: JAVASCRIPT_HREF }, [text(16, 'javascript link')]),
              el(17, 'iframe', {
                src: `${EVIL}/frame.html`,
                srcdoc: `<img src="${EVIL}/srcdoc.png">`,
              }),
              el(18, 'video', { poster: `${EVIL}/poster.png`, src: `${EVIL}/video.mp4` }),
              el(19, 'object', { data: `${EVIL}/object.swf` }),
              el(20, 'meta', { 'http-equiv': 'refresh', content: `0;url=${EVIL}/redirect` }),
              el(21, 'svg', {}, [
                el(22, 'image', { 'xlink:href': `${EVIL}/svg.png` }),
                el(23, 'use', { href: `${EVIL}/sprite.svg#a` }),
              ]),
              el(24, 'canvas', { id: 'cv', width: '40', height: '20' }),
              el(25, 'a', { id: 'plainlink', href: `${EVIL}/display-only` }, [
                text(26, 'a link that is only displayed'),
              ]),
            ]),
          ]),
        ],
      },
    },
  },
  // Attribute changes that set fetching attributes on elements seen in the snapshot.
  {
    type: 3,
    timestamp: t0 + 500,
    data: {
      source: 0,
      texts: [{ id: 5, value: `@import url(${EVIL}/import2.css);.b{color:red}` }],
      attributes: [
        { id: 11, attributes: { src: `${EVIL}/p2.gif`, srcset: `${EVIL}/p2.png 2x` } },
        { id: 6, attributes: { href: `${EVIL}/link2.css` } },
        {
          id: 14,
          attributes: { style: { 'background-image': `url(${EVIL}/inline2.png)`, color: 'red' } },
        },
      ],
      removes: [],
      adds: [
        {
          parentId: 8,
          nextId: null,
          node: el(30, 'div', {}, [
            el(31, 'img', { src: `${EVIL}/added.png` }),
            el(32, 'link', { rel: 'stylesheet', href: `${EVIL}/added.css` }),
          ]),
        },
      ],
    },
  },
  // Stylesheet, font, canvas and asset payloads.
  {
    type: 3,
    timestamp: t0 + 700,
    data: { source: 8, id: 5, adds: [{ rule: `.c{background:url(${EVIL}/rule.png)}`, index: 0 }] },
  },
  {
    type: 3,
    timestamp: t0 + 800,
    data: {
      source: 13,
      id: 5,
      index: [0],
      set: { property: 'background-image', value: `url(${EVIL}/decl.png)` },
    },
  },
  {
    type: 3,
    timestamp: t0 + 900,
    data: { source: 10, family: 'Evil', fontSource: `${EVIL}/font.woff2`, buffer: false },
  },
  {
    type: 3,
    timestamp: t0 + 1000,
    data: {
      source: 9,
      id: 24,
      type: 0,
      commands: [
        {
          property: 'drawImage',
          args: [{ rr_type: 'HTMLImageElement', src: `${EVIL}/canvas.png` }, 0, 0],
        },
      ],
    },
  },
  {
    type: 7,
    timestamp: t0 + 1100,
    data: { url: `${EVIL}/asset.png`, payload: { status: 'captured' } },
  },
  { type: 3, timestamp: t0 + 2000, data: { source: 2, type: 2, id: 25, x: 10, y: 10 } },
];
