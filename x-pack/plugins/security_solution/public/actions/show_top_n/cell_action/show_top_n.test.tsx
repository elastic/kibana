/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellActionExecutionContext } from '@kbn/cell-actions';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';
import { mockHistory } from '../../../common/mock/router';
import { createStore } from '../../../common/store';
import { createShowTopNCellActionFactory } from './show_top_n';
import React from 'react';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';

jest.mock('../../../common/lib/kibana');

jest.mock('../show_top_n_component', () => ({
  TopNAction: () => <span>{'TEST COMPONENT'}</span>,
}));

const mockServices = createStartServicesMock();
const { storage } = createSecuritySolutionStorageMock();
const mockStore = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

const element = document.createElement('div');
document.body.appendChild(element);

describe('createShowTopNCellActionFactory', () => {
  const showTopNActionFactory = createShowTopNCellActionFactory({
    store: mockStore,
    history: mockHistory,
    services: mockServices,
  });
  const showTopNAction = showTopNActionFactory({ id: 'testAction' });

  const context = {
    value: 'the-value',
    field: {
      name: 'user.name',
      type: 'keyword',
      aggregatable: true,
      searchable: true,
    },
    trigger: { id: 'trigger' },
    nodeRef: {
      current: element,
    },
    metadata: undefined,
  } as CellActionExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
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

    it('should return false if field esType does not support aggregations', async () => {
      expect(
        await showTopNAction.isCompatible({
          ...context,
          field: { ...context.field, esTypes: ['text'] },
        })
      ).toEqual(false);
    });

    it('should return false if field is not aggregatable', async () => {
      expect(
        await showTopNAction.isCompatible({
          ...context,
          field: { ...context.field, aggregatable: false },
        })
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
