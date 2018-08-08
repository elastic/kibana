/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class XpackWatcherActionDefaultsService {
  constructor(config, registry) {
    this.config = config;
    this.registry = registry;
  }

  getDefaults = (watchType, actionType) => {
    const reg = this.registry;
    const match = reg.find(registryEntry => registryEntry.watchType === watchType && registryEntry.actionType === actionType);

    return match ? match.getDefaults(this.config, watchType) : {};
  }
}
