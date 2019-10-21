/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import moment from 'moment';

// TODO: update these legacy imports to new ones.
import {
  LanguageServers,
  LanguageServersDeveloping,
} from '../../../legacy/plugins/code/server/lsp/language_servers';
import { DEFAULT_WATERMARK_LOW_PERCENTAGE } from '../../../legacy/plugins/code/server/disk_watermark';

const createCodeConfigSchema = () => {
  const langSwitches: any = {};
  LanguageServers.forEach(lang => {
    langSwitches[lang.name] = schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    });
  });
  LanguageServersDeveloping.forEach(lang => {
    langSwitches[lang.name] = schema.object({
      enabled: schema.boolean({ defaultValue: false }),
    });
  });

  return schema.object({
    ui: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
    enabled: schema.boolean({ defaultValue: true }),
    diffPage: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
    }),
    integrations: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
    }),
    queueIndex: schema.string({ defaultValue: '.code_internal-worker-queue' }),
    // 1 hour by default.
    queueTimeoutMs: schema.number({
      defaultValue: moment.duration(1, 'hour').asMilliseconds(),
    }),
    // The frequency which update scheduler executes. 1 minute by default.
    updateFrequencyMs: schema.number({
      defaultValue: moment.duration(1, 'minute').asMilliseconds(),
    }),
    // The frequency which index scheduler executes. 1 day by default.
    indexFrequencyMs: schema.number({
      defaultValue: moment.duration(1, 'day').asMilliseconds(),
    }),
    // The frequency which each repo tries to update. 5 minutes by default.
    updateRepoFrequencyMs: schema.number({
      defaultValue: moment.duration(5, 'minute').asMilliseconds(),
    }),
    // The frequency which each repo tries to index. 1 day by default.
    indexRepoFrequencyMs: schema.number({
      defaultValue: moment.duration(1, 'day').asMilliseconds(),
    }),
    // whether we want to show more logs
    verbose: schema.boolean({ defaultValue: false }),
    lsp: schema.object({
      ...langSwitches,
      // timeout of a request
      requestTimeoutMs: schema.number({
        defaultValue: moment.duration(10, 'second').asMilliseconds(),
      }),
      // if we want the language server run in seperately
      detach: schema.boolean({ defaultValue: false }),
      // enable oom_score_adj on linux
      oomScoreAdj: schema.boolean({ defaultValue: true }),
    }),
    repos: schema.arrayOf(schema.string(), { defaultValue: [] }),
    security: schema.object({
      enableMavenImport: schema.boolean({ defaultValue: true }),
      enableGradleImport: schema.boolean({ defaultValue: false }),
      installGoDependency: schema.boolean({ defaultValue: false }),
      installNodeDependency: schema.boolean({ defaultValue: true }),
      gitHostWhitelist: schema.arrayOf(schema.string(), {
        defaultValue: [
          'github.com',
          'gitlab.com',
          'bitbucket.org',
          'gitbox.apache.org',
          'eclipse.org',
        ],
      }),
      gitProtocolWhitelist: schema.arrayOf(schema.string(), {
        defaultValue: ['https', 'git', 'ssh'],
      }),
      enableJavaSecurityManager: schema.boolean({ defaultValue: true }),
      extraJavaRepositoryWhitelist: schema.arrayOf(schema.string(), {
        defaultValue: [],
      }),
    }),
    disk: schema.object({
      thresholdEnabled: schema.boolean({ defaultValue: true }),
      watermarkLow: schema.string({ defaultValue: `${DEFAULT_WATERMARK_LOW_PERCENTAGE}%` }),
    }),
    maxWorkspace: schema.number({ defaultValue: 5 }), // max workspace folder for each language server
    enableGlobalReference: schema.boolean({ defaultValue: false }), // Global reference as optional feature for now
    enableCommitIndexing: schema.boolean({ defaultValue: false }),
    codeNodeUrl: schema.maybe(schema.string()),
    clustering: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
      codeNodes: schema.arrayOf(
        schema.object({
          id: schema.string(),
          address: schema.string(),
        }),
        {
          defaultValue: [],
        }
      ),
    }),
  });
};

export const CodeConfigSchema = createCodeConfigSchema();
