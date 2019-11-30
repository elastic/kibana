/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from 'src/core/public';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';

interface CloudConfigType {
  id?: string;
}

export interface CloudSetup {
  cloudId?: string;
  isCloudEnabled: boolean;
}

export class CloudPlugin implements Plugin<CloudSetup> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public async setup(core: CoreSetup) {
    const { id } = this.initializerContext.config.get<CloudConfigType>();
    const isCloudEnabled = getIsCloudEnabled(id);

    return {
      cloudId: id,
      isCloudEnabled,
    };
  }

  public start() {}
}
