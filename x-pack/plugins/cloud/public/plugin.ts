/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import { ELASTIC_SUPPORT_LINK } from '../common/constants';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';

interface CloudConfigType {
  id?: string;
}

interface CloudSetupDependencies {
  home?: HomePublicPluginSetup;
}

export interface CloudSetup {
  cloudId?: string;
  isCloudEnabled: boolean;
}

export class CloudPlugin implements Plugin<CloudSetup> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public async setup(core: CoreSetup, { home }: CloudSetupDependencies) {
    const { id } = this.initializerContext.config.get<CloudConfigType>();
    const isCloudEnabled = getIsCloudEnabled(id);

    if (home) {
      home.environment.update({ cloud: isCloudEnabled });
      if (isCloudEnabled) {
        home.tutorials.setVariable('cloud', { id });
      }
    }

    return {
      cloudId: id,
      isCloudEnabled,
    };
  }

  public start(coreStart: CoreStart) {
    coreStart.chrome.setHelpSupportUrl(ELASTIC_SUPPORT_LINK);
  }
}
