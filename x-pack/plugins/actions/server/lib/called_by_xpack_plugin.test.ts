/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { calledByXPackPlugin } from './called_by_xpack_plugin';

const mockCallsites = jest.fn();
jest.mock('callsites', () => {
  return jest.fn().mockImplementation(() => {
    return mockCallsites();
  });
});

describe('calledByXPackPlugin', () => {
  test('returns true if call site is within X-pack once it leaves the actions plugin', async () => {
    mockCallsites.mockReturnValue([
      mockCallSite(
        '/Users/gidi/development/elastic/kibana/x-pack/plugins/actions/server/lib/called_by_xpack_plugin.test.ts'
      ),
      mockCallSite(
        '/Users/gidi/development/elastic/kibana/x-pack/plugins/actions/server/plugin.ts'
      ),
      mockCallSite(null),
      mockCallSite(
        '/Users/gidi/development/elastic/kibana/x-pack/plugins/uptime/server/uptime_server.ts'
      ),
      mockCallSite(
        '/Users/gidi/development/elastic/kibana/x-pack/plugins/uptime/server/kibana.index.ts'
      ),
    ]);
    expect(calledByXPackPlugin()).toEqual(true);
  });

  test('returns false if call site is outside of X-pack once it leaves the actions plugin', async () => {
    mockCallsites.mockReturnValue([
      mockCallSite(
        '/Users/gidi/development/elastic/kibana/x-pack/plugins/actions/server/lib/called_by_xpack_plugin.test.ts'
      ),
      mockCallSite(
        '/Users/gidi/development/elastic/kibana/x-pack/plugins/actions/server/plugin.ts'
      ),
      mockCallSite('/Users/gidi/development/elastic/kibana/plugins/some3rdparty/server/plugin.ts'),
    ]);
    expect(calledByXPackPlugin()).toEqual(false);
  });

  test('returns false if call site is outside of X-pack but pretends to be in it', async () => {
    mockCallsites.mockReturnValue([
      mockCallSite(
        '/Users/gidi/development/elastic/kibana/x-pack/plugins/actions/server/lib/called_by_xpack_plugin.test.ts'
      ),
      mockCallSite(
        '/Users/gidi/development/elastic/kibana/x-pack/plugins/actions/server/plugin.ts'
      ),
      mockCallSite(
        '/Users/gidi/development/elastic/kibana/plugins/some3rdparty/server/x-pack/plugins/someFakeXPackPlugin/plugin.ts'
      ),
    ]);
    expect(calledByXPackPlugin()).toEqual(false);
  });
});

function mockCallSite(path: string | null) {
  return {
    getFileName: () => path,
    getThis: () => undefined,
    getTypeName: () => null,
    getFunction: () => undefined,
    getFunctionName: () => null,
    getMethodName: () => undefined,
    getLineNumber: () => null,
    getColumnNumber: () => null,
    getEvalOrigin: () => undefined,
    isToplevel: () => false,
    isEval: () => false,
    isNative: () => false,
    isConstructor: () => false,
  };
}
