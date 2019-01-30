/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { PluginProperties, Server } from 'hapi';
import JoiNamespace from 'joi';
import { Feature } from 'x-pack/plugins/xpack_main/server/lib/feature_registry/feature_registry';
import { initInfraServer } from './infra_server';
import { compose } from './lib/compose/kibana';
import { UsageCollector } from './usage/usage_collector';

interface KibanaPluginProperties extends PluginProperties {
  xpack_main: {
    registerFeature: (feature: Feature) => void;
  };
}

export interface KbnServer extends Server {
  usage: any;
  plugins: KibanaPluginProperties;
}

export const initServerWithKibana = (kbnServer: KbnServer) => {
  const libs = compose(kbnServer);
  initInfraServer(libs);

  // Register a function with server to manage the collection of usage stats
  kbnServer.usage.collectorSet.register(UsageCollector.getUsageCollector(kbnServer));

  const xpackMainPlugin = kbnServer.plugins.xpack_main;
  xpackMainPlugin.registerFeature({
    id: 'infrastructure',
    name: i18n.translate('xpack.infra.featureRegistry.linkInfrastructureTitle', {
      defaultMessage: 'Infrastructure',
    }),
    icon: 'infraApp',
    navLinkId: 'infra:home',
    catalogue: ['infraops'],
    privileges: {
      read: {
        app: ['infra', 'kibana'],
        savedObject: {
          all: [],
          read: ['config'],
        },
        ui: [],
      },
    },
  });

  xpackMainPlugin.registerFeature({
    id: 'logs',
    name: i18n.translate('xpack.infra.featureRegistry.linkLogsTitle', {
      defaultMessage: 'Logs',
    }),
    icon: 'loggingApp',
    navLinkId: 'infra:logs',
    catalogue: ['infralogging'],
    privileges: {
      read: {
        app: ['infra', 'kibana'],
        savedObject: {
          all: [],
          read: ['config'],
        },
        ui: [],
      },
    },
  });
};

export const getConfigSchema = (Joi: typeof JoiNamespace) => {
  const InfraDefaultSourceConfigSchema = Joi.object({
    metricAlias: Joi.string(),
    logAlias: Joi.string(),
    fields: Joi.object({
      container: Joi.string(),
      host: Joi.string(),
      pod: Joi.string(),
      tiebreaker: Joi.string(),
      timestamp: Joi.string(),
    }),
  });

  const InfraRootConfigSchema = Joi.object({
    enabled: Joi.boolean().default(true),
    query: Joi.object({
      partitionSize: Joi.number(),
      partitionFactor: Joi.number(),
    }).default(),
    sources: Joi.object()
      .keys({
        default: InfraDefaultSourceConfigSchema,
      })
      .default(),
  }).default();

  return InfraRootConfigSchema;
};

export const getDeprecations = () => [];

// interface DeprecationHelpers {
//   rename(oldKey: string, newKey: string): (settings: unknown, log: unknown) => void;
//   unused(oldKey: string): (settings: unknown, log: unknown) => void;
// }
