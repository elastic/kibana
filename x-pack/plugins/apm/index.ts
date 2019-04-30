/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Server } from 'hapi';
import { resolve } from 'path';
import { CoreSetup, PluginInitializerContext } from 'src/core/server/index.js';
import mappings from './mappings.json';
import { plugin } from './server/new-platform/index';

// TODO: get proper types
export function apm(kibana: any) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main', 'apm_oss'],
    id: 'apm',
    configPrefix: 'xpack.apm',
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      app: {
        title: 'APM',
        description: i18n.translate('xpack.apm.apmForESDescription', {
          defaultMessage: 'APM for the Elastic Stack'
        }),
        main: 'plugins/apm/index',
        icon: 'plugins/apm/icon.svg',
        euiIconType: 'apmApp',
        order: 8100
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      home: ['plugins/apm/register_feature'],

      // TODO: get proper types
      injectDefaultVars(server: Server) {
        const config = server.config();
        return {
          apmUiEnabled: config.get('xpack.apm.ui.enabled'),
          apmIndexPatternTitle: config.get('apm_oss.indexPattern') // TODO: rename to apm_oss.indexPatternTitle in 7.0 (breaking change)
        };
      },
      hacks: ['plugins/apm/hacks/toggle_app_link_in_nav'],
      savedObjectSchemas: {
        'apm-telemetry': {
          isNamespaceAgnostic: true
        }
      },
      mappings
    },

    // TODO: get proper types
    config(Joi: any) {
      return Joi.object({
        // display menu item
        ui: Joi.object({
          enabled: Joi.boolean().default(true),
          transactionGroupBucketSize: Joi.number().default(100)
        }).default(),

        // enable plugin
        enabled: Joi.boolean().default(true),

        // buckets
        minimumBucketSize: Joi.number().default(15),
        bucketTargetCount: Joi.number().default(27)
      }).default();
    },

    // TODO: get proper types
    init(server: Server) {
      server.plugins.xpack_main.registerFeature({
        id: 'apm',
        name: i18n.translate('xpack.apm.featureRegistry.apmFeatureName', {
          defaultMessage: 'APM'
        }),
        icon: 'apmApp',
        navLinkId: 'apm',
        app: ['apm', 'kibana'],
        catalogue: ['apm'],
        privileges: {
          all: {
            api: ['apm'],
            catalogue: ['apm'],
            savedObject: {
              all: [],
              read: []
            },
            ui: ['show', 'save']
          },
          read: {
            api: ['apm'],
            catalogue: ['apm'],
            savedObject: {
              all: [],
              read: []
            },
            ui: ['show']
          }
        }
      });

      const initializerContext = {} as PluginInitializerContext;
      const core = {
        http: {
          server
        }
      } as CoreSetup;
      plugin(initializerContext).setup(core);
    }
  });
}
