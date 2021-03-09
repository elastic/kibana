/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from 'src/core/public';
import { TestComponent } from '.';

export interface CaseUi {
  caseComponent?: () => JSX.Element;
}

// export interface CaseUiSetup {}

export interface CaseUiStart {
  caseComponent: () => JSX.Element;
}

export class CaseUiPlugin implements Plugin<void, CaseUiStart> {
  private readonly caseUi: CaseUi = {};

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): void {
    this.caseUi.caseComponent = TestComponent;
  }

  public start(core: CoreStart): CaseUiStart {
    return this.caseUi as CaseUiStart;
  }

  public stop() {}
}
