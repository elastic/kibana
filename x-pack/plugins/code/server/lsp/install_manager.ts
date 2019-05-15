/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import { Server } from 'hapi';
import { InstallationType } from '../../common/installation';
import { LanguageServerStatus } from '../../common/language_server';
import { ServerOptions } from '../server_options';
import { LanguageServerDefinition } from './language_servers';

export class InstallManager {
  constructor(readonly server: Server, readonly serverOptions: ServerOptions) {}

  public status(def: LanguageServerDefinition): LanguageServerStatus {
    if (def.installationType === InstallationType.Embed) {
      return LanguageServerStatus.READY;
    }
    // @ts-ignore
    const plugin = this.server.plugins[def.installationPluginName!];
    if (plugin) {
      const pluginPath = plugin.install.path;
      if (fs.existsSync(pluginPath)) {
        return LanguageServerStatus.READY;
      }
    }
    return LanguageServerStatus.NOT_INSTALLED;
  }

  public installationPath(def: LanguageServerDefinition): string | undefined {
    if (def.installationType === InstallationType.Embed) {
      return def.embedPath!;
    }
    // @ts-ignore
    const plugin: any = this.server.plugins[def.installationPluginName];
    if (plugin) {
      return plugin.install.path;
    }
    return undefined;
  }
}
