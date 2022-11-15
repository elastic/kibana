/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { CustomBrandingPluginSetup, CustomBrandingPluginStart } from './types';

export class CustomBrandingPlugin
  implements Plugin<CustomBrandingPluginSetup, CustomBrandingPluginStart>
{
  public setup(core: CoreSetup): CustomBrandingPluginSetup {
    // Return methods that should be available to other plugins
    return {
      getGreeting() {
        return i18n.translate('customBranding.greetingText', {
          defaultMessage: 'Hello from {name}!',
          values: {
            name: 'plugin',
          },
        });
      },
    };
  }

  public start(core: CoreStart): CustomBrandingPluginStart {
    return {};
  }

  public stop() {}
}
