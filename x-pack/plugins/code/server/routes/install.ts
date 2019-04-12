/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Boom from 'boom';
import { Request, Server } from 'hapi';
import { InstallationType } from '../../common/installation';
import { InstallManager } from '../lsp/install_manager';
import { LanguageServerDefinition, LanguageServers } from '../lsp/language_servers';
import { LspService } from '../lsp/lsp_service';

export function installRoute(
  server: Server,
  lspService: LspService,
  installManager: InstallManager
) {
  const kibanaVersion = server.config().get('pkg.version') as string;
  const status = (def: LanguageServerDefinition) => ({
    name: def.name,
    status: lspService.languageServerStatus(def.name),
    version: def.version,
    build: def.build,
    languages: def.languages,
    installationType: def.installationType,
    downloadUrl:
      typeof def.downloadUrl === 'function' ? def.downloadUrl(def, kibanaVersion) : def.downloadUrl,
    pluginName: def.pluginName,
  });

  server.securedRoute({
    path: '/api/code/install',
    handler() {
      return LanguageServers.map(status);
    },
    method: 'GET',
  });

  server.route({
    path: '/api/code/install/{name}',
    handler(req: Request) {
      const name = req.params.name;
      const def = LanguageServers.find(d => d.name === name);
      if (def) {
        return status(def);
      } else {
        return Boom.notFound(`language server ${name} not found.`);
      }
    },
    method: 'GET',
  });

  server.securedRoute({
    path: '/api/code/install/{name}',
    requireAdmin: true,
    async handler(req: Request) {
      const name = req.params.name;
      const def = LanguageServers.find(d => d.name === name);
      if (def) {
        if (def.installationType === InstallationType.Plugin) {
          return Boom.methodNotAllowed(
            `${name} language server can only be installed by plugin ${def.installationPluginName}`
          );
        }
        await installManager.install(def);
      } else {
        return Boom.notFound(`language server ${name} not found.`);
      }
    },
    method: 'POST',
  });
}
