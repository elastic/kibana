/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  clickEvent,
  element,
  fullSnapshotEvent,
  metaEvent,
  mutationEvent,
  T0,
  textNode,
  toReplayEvent,
} from '../../test_helpers/replay_events';
import { createEventUrlNeutralizer } from './neutralize_event_urls';

// Built from parts so the repository's no-script-url lint rule does not flag the test data.
const JAVASCRIPT_VOID = `${'javascript'}:void(0)`;
// rrweb's own attribute name does not match the repository's naming convention for literal keys.
const RR_DATA_URL = 'rr_dataURL';
const EVIL = 'https://evil.example/p.gif?x=1';
const ALLOWED = 'https://cdn.shop.example/logo.png';

const neutralizer = () =>
  createEventUrlNeutralizer({ allowedOrigins: ['https://cdn.shop.example'] });
const serialize = (value: unknown): string => JSON.stringify(value);

const snapshotWith = (...bodyChildren: unknown[]) =>
  fullSnapshotEvent(T0, [
    element(2, 'html', {}, [element(3, 'head'), element(4, 'body', {}, bodyChildren)]),
  ]);

describe('createEventUrlNeutralizer', () => {
  describe('snapshot attributes', () => {
    it.each([
      ['img src', element(10, 'img', { src: EVIL })],
      ['img srcset', element(10, 'img', { srcset: `${EVIL} 2x` })],
      ['img with a relative src', element(10, 'img', { src: '/relative.png' })],
      ['img with a protocol-relative src', element(10, 'img', { src: '//evil.example/p.gif' })],
      ['video poster', element(10, 'video', { poster: EVIL })],
      ['source srcset', element(10, 'source', { srcset: `${EVIL} 1x, ${EVIL} 2x` })],
      ['legacy body background', element(10, 'body', { background: EVIL })],
      ['svg image href', element(10, 'image', { href: EVIL })],
      ['svg use xlink:href', element(10, 'use', { 'xlink:href': EVIL })],
      ['link href', element(10, 'link', { rel: 'stylesheet', href: EVIL })],
      ['base href', element(10, 'base', { href: EVIL })],
      ['iframe src', element(10, 'iframe', { src: EVIL })],
      ['iframe srcdoc', element(10, 'iframe', { srcdoc: `<img src="${EVIL}">` })],
      ['embed src', element(10, 'embed', { src: EVIL })],
      ['object data', element(10, 'object', { data: EVIL })],
      ['meta refresh', element(10, 'meta', { 'http-equiv': 'refresh', content: `0;url=${EVIL}` })],
      ['inline style url', element(10, 'div', { style: `background:url(${EVIL})` })],
      ['link preloaded image set', element(10, 'link', { imagesrcset: `${EVIL} 1x` })],
      ['rrweb iframe source', element(10, 'iframe', { rr_src: EVIL })],
      ['rrweb image data URL naming a remote image', element(10, 'img', { [RR_DATA_URL]: EVIL })],
      [
        'rrweb canvas data URL naming a remote image',
        element(10, 'canvas', { [RR_DATA_URL]: EVIL }),
      ],
      ['inlined stylesheet text', element(10, 'link', { _cssText: `@import url(${EVIL});` })],
    ])('neutralises %s', (_name, node) => {
      const result = neutralizer()(snapshotWith(node));

      expect(serialize(result)).not.toContain('evil.example');
    });

    it('keeps the element so the layout is unchanged', () => {
      const result = neutralizer()(snapshotWith(element(10, 'img', { src: EVIL, width: '10' })));

      expect(serialize(result)).toContain('"tagName":"img"');
      expect(serialize(result)).toContain('"width":"10"');
    });

    it('keeps images from allowlisted origins and data URLs', () => {
      const result = neutralizer()(
        snapshotWith(
          element(10, 'img', { src: ALLOWED }),
          element(11, 'img', { src: 'data:image/png;base64,AAAA' }),
          element(12, 'img', { srcset: 'data:image/png;base64,AAAA 2x' })
        )
      );

      expect(serialize(result)).toContain(ALLOWED);
      expect(serialize(result)).toContain('data:image/png;base64,AAAA');
      expect(serialize(result)).toContain('data:image/png;base64,AAAA 2x');
    });

    it('does not load nested documents, stylesheets or base URLs even from allowlisted origins', () => {
      const result = neutralizer()(
        snapshotWith(
          element(10, 'iframe', { src: ALLOWED }),
          element(11, 'link', { rel: 'stylesheet', href: ALLOWED }),
          element(12, 'base', { href: 'https://cdn.shop.example/' })
        )
      );

      expect(serialize(result)).not.toContain('cdn.shop.example');
    });

    it('keeps rrweb image data URLs that really are data URLs', () => {
      const result = neutralizer()(
        snapshotWith(element(10, 'canvas', { [RR_DATA_URL]: 'data:image/png;base64,AAAA' }))
      );

      expect(serialize(result)).toContain('data:image/png;base64,AAAA');
    });

    it('is case-insensitive about tag and attribute names', () => {
      const result = neutralizer()(snapshotWith(element(10, 'IMG', { SRC: EVIL })));

      expect(serialize(result)).not.toContain('evil.example');
    });
  });

  describe('display-only URLs are left as recorded', () => {
    it('keeps links, even javascript links, which are inert under the sandbox', () => {
      const result = neutralizer()(
        snapshotWith(
          element(10, 'a', { href: EVIL }),
          element(11, 'area', { href: JAVASCRIPT_VOID })
        )
      );

      expect(serialize(result)).toContain(EVIL);
      expect(serialize(result)).toContain(JAVASCRIPT_VOID);
    });

    it('keeps the recorded page address in viewport events and the same event reference', () => {
      const meta = metaEvent(T0, EVIL);

      expect(neutralizer()(meta)).toBe(meta);
    });

    it('keeps text content that looks like CSS or a URL', () => {
      const result = neutralizer()(
        snapshotWith(element(10, 'p', {}, [textNode(11, `see url(${EVIL}) and @import "x"`)]))
      );

      expect(serialize(result)).toContain(EVIL);
    });

    it('does not touch events rrweb does not interpret', () => {
      const custom = toReplayEvent({
        type: 5,
        timestamp: T0,
        data: { tag: 'x', payload: { src: EVIL } },
      });

      expect(neutralizer()(custom)).toBe(custom);
    });

    it('returns the same event when nothing needed neutralising', () => {
      const click = clickEvent(T0);
      const harmless = snapshotWith(
        element(10, 'a', { href: EVIL }),
        element(11, 'img', { src: ALLOWED }),
        element(12, 'p', {}, [textNode(13, 'hello')])
      );
      const neutralize = neutralizer();

      expect(neutralize(click)).toBe(click);
      expect(neutralize(harmless)).toBe(harmless);
    });
  });

  describe('stylesheets', () => {
    it('neutralises style element text and remembers it for later text changes', () => {
      const neutralize = neutralizer();
      const snapshot = neutralize(
        snapshotWith(element(10, 'style', {}, [textNode(11, `.a{background:url(${EVIL})}`, true)]))
      );
      const update = neutralize(
        mutationEvent(T0 + 1, { texts: [{ id: 11, value: `@import url(${EVIL});.b{color:red}` }] })
      );

      expect(serialize(snapshot)).not.toContain('evil.example');
      expect(serialize(update)).not.toContain('evil.example');
      expect(serialize(update)).toContain('.b{color:red}');
    });

    it('leaves text changes of ordinary text nodes untouched', () => {
      const neutralize = neutralizer();
      neutralize(snapshotWith(element(10, 'p', {}, [textNode(11, 'hello')])));
      const update = mutationEvent(T0 + 1, { texts: [{ id: 11, value: `url(${EVIL})` }] });

      expect(serialize(neutralize(update))).toContain(EVIL);
    });

    it.each([
      [
        'a stylesheet rule insertion',
        { source: 8, id: 10, adds: [{ rule: `.a{background:url(${EVIL})}`, index: 0 }] },
      ],
      ['a stylesheet replace', { source: 8, id: 10, replace: `@import url(${EVIL});` }],
      [
        'a style declaration change',
        {
          source: 13,
          id: 10,
          index: [0],
          set: { property: 'background-image', value: `url(${EVIL})` },
        },
      ],
      [
        'an adopted stylesheet',
        {
          source: 15,
          id: 10,
          styleIds: [1],
          styles: [{ styleId: 1, rules: [{ rule: `.a{background:url(${EVIL})}`, index: 0 }] }],
        },
      ],
    ])('neutralises %s', (_name, data) => {
      const result = neutralizer()(toReplayEvent({ type: 3, timestamp: T0, data }));

      expect(serialize(result)).not.toContain('evil.example');
    });
  });

  describe('incremental events', () => {
    it('neutralises attribute changes using the tag learned from the snapshot', () => {
      const neutralize = neutralizer();
      neutralize(snapshotWith(element(10, 'link', { rel: 'stylesheet' }), element(11, 'a', {})));

      const result = neutralize(
        mutationEvent(T0 + 1, {
          attributes: [
            { id: 10, attributes: { href: EVIL } },
            { id: 11, attributes: { href: EVIL } },
          ],
        })
      );

      expect(serialize(result)).toContain('"id":10,"attributes":{"href":null}');
      expect(serialize(result)).toContain(`"id":11,"attributes":{"href":"${EVIL}"}`);
    });

    it('drops ambiguous attributes of an unknown element and keeps harmless ones', () => {
      const result = neutralizer()(
        mutationEvent(T0, {
          attributes: [
            { id: 99, attributes: { href: EVIL, src: EVIL, class: 'x', title: 'hello' } },
          ],
        })
      );

      expect(serialize(result)).toContain('"href":null');
      expect(serialize(result)).toContain('"src":null');
      expect(serialize(result)).toContain('"class":"x"');
      expect(serialize(result)).toContain('"title":"hello"');
    });

    it('neutralises style attribute maps and keeps removals', () => {
      const result = neutralizer()(
        mutationEvent(T0, {
          attributes: [
            {
              id: 99,
              attributes: {
                style: { background: `url(${EVIL})`, color: 'red', margin: false },
              },
            },
          ],
        })
      );

      expect(serialize(result)).not.toContain('evil.example');
      expect(serialize(result)).toContain('"color":"red"');
      expect(serialize(result)).toContain('"margin":false');
    });

    it('neutralises nodes added by a mutation', () => {
      const result = neutralizer()(
        mutationEvent(T0, {
          adds: [
            {
              parentId: 4,
              nextId: null,
              node: element(20, 'div', {}, [element(21, 'img', { src: EVIL })]),
            },
          ],
        })
      );

      expect(serialize(result)).not.toContain('evil.example');
      expect(serialize(result)).toContain('"tagName":"img"');
    });

    it('uses tags of nodes added earlier by a mutation for later attribute changes', () => {
      const neutralize = neutralizer();
      neutralize(
        mutationEvent(T0, { adds: [{ parentId: 4, nextId: null, node: element(30, 'link', {}) }] })
      );

      const result = neutralize(
        mutationEvent(T0 + 1, { attributes: [{ id: 30, attributes: { href: EVIL } }] })
      );

      expect(serialize(result)).toContain('"href":null');
    });
  });

  describe('non-DOM payloads', () => {
    it('neutralises image arguments of canvas commands and keeps data URLs', () => {
      const result = neutralizer()(
        toReplayEvent({
          type: 3,
          timestamp: T0,
          data: {
            source: 9,
            id: 5,
            type: 0,
            commands: [
              { property: 'drawImage', args: [{ rr_type: 'HTMLImageElement', src: EVIL }, 0, 0] },
              {
                property: 'drawImage',
                args: [{ rr_type: 'HTMLImageElement', src: 'data:image/png;base64,AAAA' }, 0, 0],
              },
            ],
          },
        })
      );

      expect(serialize(result)).not.toContain('evil.example');
      expect(serialize(result)).toContain('data:image/png;base64,AAAA');
    });

    it('neutralises a font URL but keeps font bytes', () => {
      const neutralize = neutralizer();

      const remote = neutralize(
        toReplayEvent({
          type: 3,
          timestamp: T0,
          data: { source: 10, family: 'x', fontSource: EVIL, buffer: false },
        })
      );
      const bytes = neutralize(
        toReplayEvent({
          type: 3,
          timestamp: T0,
          data: { source: 10, family: 'x', fontSource: '[1,2,3]', buffer: true },
        })
      );

      expect(serialize(remote)).not.toContain('evil.example');
      expect(serialize(bytes)).toContain('[1,2,3]');
    });

    it('neutralises the URL of an asset event', () => {
      const result = neutralizer()(
        toReplayEvent({
          type: 7,
          timestamp: T0,
          data: { url: EVIL, payload: { status: 'captured' } },
        })
      );

      expect(serialize(result)).not.toContain('evil.example');
    });
  });

  describe('hostile document', () => {
    it('leaves no remote URL anywhere in a snapshot built to fetch on every path', () => {
      const result = neutralizer()(
        fullSnapshotEvent(T0, [
          element(2, 'html', {}, [
            element(3, 'head', {}, [
              element(4, 'style', {}, [
                textNode(5, `@import url(${EVIL});.x{background:url(${EVIL})}`, true),
              ]),
              element(6, 'link', { rel: 'stylesheet', href: EVIL }),
              element(7, 'base', { href: EVIL }),
            ]),
            element(8, 'body', { background: EVIL }, [
              element(9, 'img', { src: EVIL, srcset: `${EVIL} 2x`, onerror: 'steal()' }),
              element(10, 'img', { src: '/relative.png' }),
              element(11, 'div', { style: `background-image:url(${EVIL})` }),
              element(12, 'iframe', { src: EVIL, srcdoc: `<img src="${EVIL}">` }),
              element(13, 'video', { poster: EVIL, src: EVIL }),
              element(14, 'object', { data: EVIL }),
              element(15, 'svg', {}, [
                element(16, 'image', { 'xlink:href': EVIL }),
                element(17, 'use', { href: EVIL }),
              ]),
            ]),
          ]),
        ])
      );

      expect(serialize(result)).not.toMatch(/evil\.example|relative\.png/);
    });
  });

  describe('purity', () => {
    it('does not mutate the event it is given', () => {
      const event = snapshotWith(element(10, 'img', { src: EVIL }));
      const before = serialize(event);

      neutralizer()(event);

      expect(serialize(event)).toBe(before);
    });
  });
});
