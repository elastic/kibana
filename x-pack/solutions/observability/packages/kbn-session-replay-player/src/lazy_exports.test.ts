/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('package entry', () => {
  it('does not load rrweb when it is imported', () => {
    let rrwebLoaded = false;
    jest.isolateModules(() => {
      jest.doMock('rrweb', () => {
        rrwebLoaded = true;
        return {};
      });
      jest.doMock('rrweb/dist/style.css', () => ({}), { virtual: true });

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const entry = require('..');

      expect(Object.keys(entry)).toContain('SessionReplayPlayer');
    });

    expect(rrwebLoaded).toBe(false);
  });
});
