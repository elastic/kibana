/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { TimelineId } from '../../../../common/types';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';
import { createStore } from '../../../common/store';
import { Subject } from 'rxjs';
import { KibanaServices } from '../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../common/constants';
import { createFilterOutAction } from './filter_out';

jest.mock('../../../common/lib/kibana');

const currentAppId$ = new Subject<string | undefined>();
KibanaServices.get().application.currentAppId$ = currentAppId$.asObservable();

const mockState = {
  ...mockGlobalState,
  timeline: {
    ...mockGlobalState.timeline,
    timelineById: {
      ...mockGlobalState.timeline.timelineById,
      [TimelineId.active]: {
        ...mockGlobalState.timeline.timelineById[TimelineId.active],
        filterManager: createFilterManagerMock(),
      },
    },
  },
};

const { storage } = createSecuritySolutionStorageMock();
const mockStore = createStore(mockState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

describe('Timeline createFilterOutAction', () => {
  const filterOutAction = createFilterOutAction({ store: mockStore, order: 1 });
  const context = {
    field: { name: 'user.name', value: 'the value', type: 'text' },
  } as CellActionExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    currentAppId$.next(APP_UI_ID);
  });

  it('should return display name', () => {
    expect(filterOutAction.getDisplayName(context)).toEqual('Filter Out');
  });

  it('should return icon type', () => {
    expect(filterOutAction.getIconType(context)).toEqual('minusInCircle');
  });

  describe('isCompatible', () => {
    it('should return true if everything is okay', async () => {
      expect(await filterOutAction.isCompatible(context)).toEqual(true);
    });

    it('should return false if not in Security', async () => {
      currentAppId$.next('not security');
      expect(await filterOutAction.isCompatible(context)).toEqual(false);
    });
  });

  describe('execute', () => {
    it('should execute normally', async () => {
      await filterOutAction.execute(context);
      expect(
        mockState.timeline.timelineById[TimelineId.active].filterManager?.addFilters
      ).toHaveBeenCalled();
    });
  });
});
