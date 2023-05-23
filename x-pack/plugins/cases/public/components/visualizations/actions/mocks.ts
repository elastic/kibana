/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreTheme } from '@kbn/core/public';
import { of, Subject } from 'rxjs';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { createBrowserHistory } from 'history';
import type { CaseUIActionProps } from './types';

const mockTheme: CoreTheme = {
  darkMode: false,
};

const createThemeMock = (): CoreTheme => {
  return { ...mockTheme };
};

export const createTheme$Mock = () => {
  return of(createThemeMock());
};

export class MockEmbeddable {
  public type;
  private input;
  constructor(
    type: string,
    input?: {
      attributes: TypedLensByValueInput['attributes'];
      id: string;
      timeRange: { from: string; to: string; fromStr: string; toStr: string };
    }
  ) {
    this.type = type;
    this.input = input;
  }
  getFilters() {}
  getQuery() {}
  getInput() {
    return this.input;
  }
}

export const mockAttributes = {
  title: 'mockTitle',
  description: 'mockDescription',
  references: [],
  state: {
    visualization: {
      id: 'mockId',
      type: 'mockType',
      title: 'mockTitle',
      visualizationType: 'mockVisualizationType',
      references: [],
      state: {
        datasourceStates: {
          indexpattern: {},
        },
      },
    },
  },
} as unknown as TypedLensByValueInput['attributes'];

export const getMockCaseUiActionProps = () => {
  const currentAppId$ = new Subject<string | undefined>();

  const core = {
    application: { currentAppId$: currentAppId$.asObservable(), capabilities: {} },
    theme: { theme$: createTheme$Mock() },
    uiSettings: {
      get: jest.fn().mockReturnValue(true),
    },
  };
  const plugins = {};
  const storage = {};
  const history = createBrowserHistory();
  const caseContextProps = {};

  const caseUiActionProps = {
    core,
    plugins,
    storage,
    history,
    caseContextProps,
  } as unknown as CaseUIActionProps;

  return caseUiActionProps;
};
