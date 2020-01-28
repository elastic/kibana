/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { join } from 'path';
import { CoreSetup, Logger, Plugin, PluginInitializerContext } from 'kibana/server';

import { ConsoleSetup } from '../../../../src/plugins/console/server';

import { processors } from './spec/ingest/index';

interface SetupDependencies {
  console: ConsoleSetup;
}

export class ConsoleExtensionsServerPlugin implements Plugin<void, void, SetupDependencies> {
  log: Logger;
  constructor(private readonly ctx: PluginInitializerContext) {
    this.log = this.ctx.logger.get();
  }

  setup(
    core: CoreSetup,
    { console: { addProcessorDefinition, addExtensionSpecFilePath } }: SetupDependencies
  ) {
    addExtensionSpecFilePath(join(__dirname, 'spec/'));
    processors.forEach(processor => addProcessorDefinition(processor));
    this.log.debug('Installed console autocomplete extensions.');
  }
  start() {}
}
