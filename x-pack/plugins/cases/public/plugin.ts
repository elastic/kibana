/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from 'src/core/public';
import { ReactElement } from 'react';
import { TestComponent } from '.';
import { CreateCase, CreateCaseProps } from './components/create';
import { PluginStart, SetupPlugins, StartPlugins, StartServices } from './types';

export interface CasesUiStart {
  casesComponent: () => JSX.Element;
  getCreateCase: (props: CreateCaseProps) => ReactElement<CreateCaseProps>;
}

export class CasesUiPlugin implements Plugin<void, CasesUiStart, SetupPlugins, StartPlugins> {
  private readonly casesUi = {} as CasesUiStart;

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins): void {
    this.casesUi.casesComponent = TestComponent;
    this.casesUi.getCreateCase = CreateCase;

    /**
     * `StartServices` which are needed by the `renderApp` function when mounting any of the subPlugin applications.
     * This is a promise because these aren't available until the `start` lifecycle phase but they are referenced
     * in the `setup` lifecycle phase.
     */
    const startServices: Promise<StartServices> = (async () => {
      const [coreStart, startPlugins] = await core.getStartServices();

      const services: StartServices = {
        ...coreStart,
        ...startPlugins,
      };
      return services;
    })();

    // need to figure out how to put startServices in components
    console.log('heyo startServices', startServices);
  }

  public start(core: CoreStart): CasesUiStart {
    return this.casesUi;
  }

  public stop() {}
}
