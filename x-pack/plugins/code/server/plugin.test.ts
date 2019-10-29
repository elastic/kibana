/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from '../../../../src/core/server/mocks';

import { CodePlugin } from './plugin';

describe('Code Plugin', () => {
  describe('setup()', () => {
    it('does not log deprecation message if no xpack.code.* configurations are set', async () => {
      const context = coreMock.createPluginInitializerContext();
      const plugin = new CodePlugin(context);

      await plugin.setup();

      expect(context.logger.get).not.toHaveBeenCalled();
    });

    it('logs deprecation message if any xpack.code.* configurations are set', async () => {
      const context = coreMock.createPluginInitializerContext({
        foo: 'bar',
      });
      const warn = jest.fn();
      context.logger.get = jest.fn().mockReturnValue({ warn });
      const plugin = new CodePlugin(context);

      await plugin.setup();

      expect(context.logger.get).toHaveBeenCalledWith('config', 'deprecation');
      expect(warn.mock.calls[0][0]).toMatchInlineSnapshot(
        `"The experimental app \\"Code\\" has been removed from Kibana. Remove all xpack.code.* configurations from kibana.yml so Kibana does not fail to start up in the next major version."`
      );
    });
  });
});
