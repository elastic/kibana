/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin } from '@kbn/core/server';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';

export const plugin = async () => new FooPlugin();

interface SetupDeps {
  features: FeaturesPluginSetup;
}

class FooPlugin implements Plugin {
  setup(core: CoreSetup, plugins: SetupDeps) {
    plugins.features.registerKibanaFeature({
      id: 'foo',
      name: 'Foo',
      category: { id: 'foo', label: 'foo' },
      app: ['foo_plugin', 'kibana'],
      catalogue: ['foo'],
      privileges: {
        all: {
          app: ['foo_plugin', 'kibana'],
          catalogue: ['foo'],
          savedObject: {
            all: ['foo'],
            read: ['index-pattern'],
          },
          ui: ['create', 'edit', 'delete', 'show'],
        },
        read: {
          app: ['foo_plugin', 'kibana'],
          catalogue: ['foo'],
          savedObject: {
            all: [],
            read: ['foo', 'index-pattern'],
          },
          ui: ['show'],
        },
      },
    });
  }
  start() {}
}
