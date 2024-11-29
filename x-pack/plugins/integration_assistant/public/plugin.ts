/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin, CoreSetup, PluginInitializerContext } from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';
import type { IntegrationAssistantPluginSetup, IntegrationAssistantPluginStart } from './types';
import type { IntegrationAssistantPluginStartDependencies } from '../server/types';
import { getCreateIntegrationLazy } from './components/create_integration';
import { getCreateIntegrationCardButtonLazy } from './components/create_integration_card_button';
import {
  Telemetry,
  ExperimentalFeaturesService,
  type Services,
  type RenderUpselling,
} from './services';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { type IntegrationAssistantConfigType } from '../server/config';

export class IntegrationAssistantPlugin
  implements Plugin<IntegrationAssistantPluginSetup, IntegrationAssistantPluginStart>
{
  private telemetry = new Telemetry();
  private renderUpselling$ = new BehaviorSubject<RenderUpselling | undefined>(undefined);
  private config: IntegrationAssistantConfigType;
  private experimentalFeatures: ExperimentalFeatures;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<IntegrationAssistantConfigType>();
    this.experimentalFeatures = parseExperimentalConfigValue(this.config.enableExperimental || []);
    ExperimentalFeaturesService.init(this.experimentalFeatures);
  }

  public setup(core: CoreSetup): IntegrationAssistantPluginSetup {
    this.telemetry.setup(core.analytics);
    this.config = this.config;
    return {};
  }

  public start(
    core: CoreStart,
    dependencies: IntegrationAssistantPluginStartDependencies
  ): IntegrationAssistantPluginStart {
    const services: Services = {
      ...core,
      ...dependencies,
      telemetry: this.telemetry.start(),
      renderUpselling$: this.renderUpselling$.asObservable(),
    };

    return {
      components: {
        CreateIntegration: getCreateIntegrationLazy(services),
        CreateIntegrationCardButton: getCreateIntegrationCardButtonLazy(),
      },
      renderUpselling: (renderUpselling) => {
        this.renderUpselling$.next(renderUpselling);
      },
    };
  }

  public stop() {}
}
