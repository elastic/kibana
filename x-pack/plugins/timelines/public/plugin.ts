/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from '../../../../src/core/public';
import { TimelinesPluginSetup, TimelineProps } from './types';
import { getTimelineLazy } from './methods';

export class TimelinesPlugin implements Plugin<TimelinesPluginSetup> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): TimelinesPluginSetup {
    const config = this.initializerContext.config.get<{ enabled: boolean }>();
    if (!config.enabled) {
      return {};
    }

    return {
      getTimeline: (props: TimelineProps) => {
        return getTimelineLazy(props);
      },
    };
  }

  public start() {}

  public stop() {}
}
