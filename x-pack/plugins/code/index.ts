/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import JoiNamespace from 'joi';
import moment from 'moment';
import { resolve } from 'path';

import { init } from './server/init';
import { APP_TITLE } from './common/constants';

export const code = (kibana: any) =>
  new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    id: 'code',
    configPrefix: 'xpack.code',
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      app: {
        title: APP_TITLE,
        main: 'plugins/code/app',
        euiIconType: 'codeApp',
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      injectDefaultVars(server: Server) {
        const config = server.config();
        return {
          codeUiEnabled: config.get('xpack.code.ui.enabled'),
        };
      },
      hacks: ['plugins/code/hacks/toggle_app_link_in_nav'],
    },
    config(Joi: typeof JoiNamespace) {
      return Joi.object({
        ui: Joi.object({
          enabled: Joi.boolean().default(true),
        }).default(),
        enabled: Joi.boolean().default(true),
        queueIndex: Joi.string().default('.code_internal-worker-queue'),
        // 1 hour by default.
        queueTimeoutMs: Joi.number().default(moment.duration(1, 'hour').asMilliseconds()),
        // The frequency which update scheduler executes. 5 minutes by default.
        updateFrequencyMs: Joi.number().default(moment.duration(5, 'minute').asMilliseconds()),
        // The frequency which index scheduler executes. 1 day by default.
        indexFrequencyMs: Joi.number().default(moment.duration(1, 'day').asMilliseconds()),
        // The frequency which each repo tries to update. 1 hour by default.
        updateRepoFrequencyMs: Joi.number().default(moment.duration(1, 'hour').asMilliseconds()),
        // The frequency which each repo tries to index. 1 day by default.
        indexRepoFrequencyMs: Joi.number().default(moment.duration(1, 'day').asMilliseconds()),
        lsp: Joi.object({
          // timeout of a request
          requestTimeoutMs: Joi.number().default(moment.duration(10, 'second').asMilliseconds()),
          // if we want the language server run in seperately
          detach: Joi.boolean().default(false),
          // whether we want to show more language server logs
          verbose: Joi.boolean().default(false),
        }).default(),
        repos: Joi.array().default([]),
        security: Joi.object({
          enableMavenImport: Joi.boolean().default(true),
          enableGradleImport: Joi.boolean().default(false),
          installNodeDependency: Joi.boolean().default(true),
          gitHostWhitelist: Joi.array()
            .items(Joi.string())
            .default([
              'github.com',
              'gitlab.com',
              'bitbucket.org',
              'gitbox.apache.org',
              'eclipse.org',
            ]),
          gitProtocolWhitelist: Joi.array()
            .items(Joi.string())
            .default(['https', 'git', 'ssh']),
          enableGitCertCheck: Joi.boolean().default(true),
        }).default(),
        maxWorkspace: Joi.number().default(5), // max workspace folder for each language server
        disableIndexScheduler: Joi.boolean().default(true), // Temp option to disable index scheduler.
        enableGlobalReference: Joi.boolean().default(false), // Global reference as optional feature for now
        codeNodeUrl: Joi.string(),
      }).default();
    },
    init,
  });
