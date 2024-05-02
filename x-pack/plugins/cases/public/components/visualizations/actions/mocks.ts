/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBrowserHistory } from 'history';
import { BehaviorSubject } from 'rxjs';

import type { PublicAppInfo } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { CasesUIActionProps } from './types';

const coreStart = coreMock.createStart();

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
  getFullAttributes() {
    return this.input?.attributes;
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

export const mockTimeRange = { from: '', to: '', fromStr: '', toStr: '' };

export const getMockCurrentAppId$ = () => new BehaviorSubject<string>('securitySolutionUI');
export const getMockApplications$ = () =>
  new BehaviorSubject<Map<string, PublicAppInfo>>(
    new Map([['securitySolutionUI', { category: { label: 'Test' } } as unknown as PublicAppInfo]])
  );

export const getMockCaseUiActionProps = () => {
  const core = {
    ...coreStart,
    application: { currentAppId$: getMockCurrentAppId$(), capabilities: {} },
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
  } as unknown as CasesUIActionProps;

  return caseUiActionProps;
};
