/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin, CoreSetup } from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';
import type {
  IntegrationImportPluginSetup,
  IntegrationImportPluginStart,
  IntegrationImportPluginStartDependencies,
} from './types';
import { getIntegrationImportLazy } from './components/integration_import';
import { getIntegrationImportCardButtonLazy } from './components/integration_import_card_button';
import { Telemetry, type Services, type RenderUpselling } from './services';

export class IntegrationImportPlugin
  implements Plugin<IntegrationImportPluginSetup, IntegrationImportPluginStart>
{
  private telemetry = new Telemetry();
  private renderUpselling$ = new BehaviorSubject<RenderUpselling | undefined>(undefined);

  public setup(core: CoreSetup): IntegrationImportPluginSetup {
    this.telemetry.setup(core.analytics);
    return {};
  }

  public start(
    core: CoreStart,
    dependencies: IntegrationImportPluginStartDependencies
  ): IntegrationImportPluginStart {
    const services: Services = {
      ...core,
      ...dependencies,
      telemetry: this.telemetry.start(),
      renderUpselling$: this.renderUpselling$.asObservable(),
    };

    return {
      components: {
        IntegrationImport: getIntegrationImportLazy(services),
        IntegrationImportCardButton: getIntegrationImportCardButtonLazy(),
      },
      renderUpselling: (renderUpselling) => {
        this.renderUpselling$.next(renderUpselling);
      },
    };
  }

  public stop() {}
}
