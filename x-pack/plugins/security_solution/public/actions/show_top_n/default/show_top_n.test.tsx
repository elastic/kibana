/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellActionExecutionContext } from '@kbn/cell-actions';
import { Subject } from 'rxjs';
import { APP_UI_ID } from '../../../../common/constants';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';
import { mockHistory } from '../../../common/mock/router';
import { createStore } from '../../../common/store';
import { createShowTopNAction } from './show_top_n';
import React from 'react';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';

jest.mock('../../../common/lib/kibana');

jest.mock('../show_top_n_component', () => ({
  TopNAction: () => <span>{'TEST COMPONENT'}</span>,
}));

const currentAppId$ = new Subject<string | undefined>();
const startServices = createStartServicesMock();

const mockServices = {
  ...startServices,
  application: {
    ...startServices.application,
    currentAppId$: currentAppId$.asObservable(),
  },
};

const { storage } = createSecuritySolutionStorageMock();
const mockStore = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

const element = document.createElement('div');
document.body.appendChild(element);

describe('createShowTopNAction', () => {
  const showTopNAction = createShowTopNAction({
    store: mockStore,
    history: mockHistory,
    order: 1,
    services: mockServices,
  });
  const context = {
    field: { name: 'user.name', value: 'the-value', type: 'keyword' },
    trigger: { id: 'trigger' },
    extraContentNodeRef: {
      current: element,
    },
    nodeRef: {
      current: element,
    },
  } as CellActionExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    currentAppId$.next(APP_UI_ID);
  });

  it('should return display name', () => {
    expect(showTopNAction.getDisplayName(context)).toEqual('Show top user.name');
  });

  it('should return icon type', () => {
    expect(showTopNAction.getIconType(context)).toEqual('visBarVertical');
  });

  describe('isCompatible', () => {
    it('should return true if everything is okay', async () => {
      expect(await showTopNAction.isCompatible(context)).toEqual(true);
    });

    it('should return false if not in Security', async () => {
      currentAppId$.next('not security');
      expect(await showTopNAction.isCompatible(context)).toEqual(false);
    });

    it('should return false if field type does not support aggregations', async () => {
      currentAppId$.next('not security');
      expect(
        await showTopNAction.isCompatible({ ...context, field: { ...context.field, type: 'text' } })
      ).toEqual(false);
    });
  });

  describe('execute', () => {
    it('should execute normally', async () => {
      await showTopNAction.execute(context);
      expect(document.body.textContent).toContain('TEST COMPONENT');
    });
  });
});
