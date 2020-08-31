/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { join } from 'path';
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'kibana/server';

import { ConsoleSetup, ConsoleStart } from '../../../../src/plugins/console/server';

import { processors } from './lib/spec_definitions/js';

interface SetupDependencies {
  console: ConsoleSetup;
}

interface StartDependencies {
  console: ConsoleStart;
}

const CONSOLE_XPACK_JSON_SPEC_PATH = join(__dirname, 'lib/spec_definitions/json');

export class ConsoleExtensionsServerPlugin implements Plugin<void, void, SetupDependencies> {
  log: Logger;
  constructor(private readonly ctx: PluginInitializerContext) {
    this.log = this.ctx.logger.get();
  }

  setup(core: CoreSetup, { console: { addExtensionSpecFilePath } }: SetupDependencies) {
    addExtensionSpecFilePath(CONSOLE_XPACK_JSON_SPEC_PATH);
    this.log.debug(`Added extension path to ${CONSOLE_XPACK_JSON_SPEC_PATH}...`);
  }

  start(core: CoreStart, { console: { addProcessorDefinition } }: StartDependencies) {
    processors.forEach((processor) => addProcessorDefinition(processor));
    this.log.debug('Added processor definition extensions.');
  }
}
