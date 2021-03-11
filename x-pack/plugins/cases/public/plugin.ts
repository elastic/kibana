/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin } from 'src/core/public';
import { ReactElement } from 'react';
import { TestComponent } from '.';
import { CreateCaseProps } from './components/create';
import { SetupPlugins, StartPlugins } from './types';
import { getCreateCaseLazy } from './get_create_case';

export interface CasesUiStart {
  casesComponent: () => JSX.Element;
  getCreateCase: (props: CreateCaseProps) => ReactElement<CreateCaseProps>;
}

export class CasesUiPlugin implements Plugin<void, CasesUiStart, SetupPlugins, StartPlugins> {
  public setup() {}

  public start(): CasesUiStart {
    return {
      casesComponent: TestComponent,
      getCreateCase: (props) => {
        return getCreateCaseLazy(props);
      },
    };
  }

  public stop() {}
}
