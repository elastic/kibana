/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import { ReactElement } from 'react';
import { TestComponent } from '.';
import { CreateCaseProps } from './components/create';
import { SetupPlugins, StartPlugins } from './types';
import { getCreateCaseLazy } from './get_create_case';
import { KibanaServices } from './common/lib/kibana';

export interface CasesUiStart {
  casesComponent: () => JSX.Element;
  getCreateCase: (props: CreateCaseProps) => ReactElement<CreateCaseProps>;
}

export class CasesUiPlugin implements Plugin<void, CasesUiStart, SetupPlugins, StartPlugins> {
  private kibanaVersion: string;

  constructor(initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }
  public setup() {}

  public start(core: CoreStart, plugins: StartPlugins): CasesUiStart {
    KibanaServices.init({ ...core, ...plugins, kibanaVersion: this.kibanaVersion });
    return {
      casesComponent: TestComponent,
      getCreateCase: (props) => {
        return getCreateCaseLazy(props);
      },
    };
  }

  public stop() {}
}
