/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';
import { createStore } from '../../../common/store';
import { createFilterInCellActionFactory } from './filter_in';
import type { SecurityCellActionExecutionContext } from '../../types';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { TableId } from '@kbn/securitysolution-data-table';
import { TimelineId } from '../../../../common/types';

const services = createStartServicesMock();
const mockFilterManager = services.data.query.filterManager;

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

jest.mock('@kbn/ui-actions-plugin/public', () => ({
  ...jest.requireActual('@kbn/ui-actions-plugin/public'),
  addFilterIn: () => {},
  addFilterOut: () => {},
}));

const { storage } = createSecuritySolutionStorageMock();
const mockStore = createStore(mockState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

describe('createFilterInCellActionFactory', () => {
  const createFilterInCellAction = createFilterInCellActionFactory({ store: mockStore, services });
  const filterInAction = createFilterInCellAction({ id: 'testAction' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const context = {
    field: { name: 'user.name', type: 'text' },
    value: 'the value',
  } as SecurityCellActionExecutionContext;

  it('should return display name', () => {
    expect(filterInAction.getDisplayName(context)).toEqual('Filter In');
  });

  it('should return icon type', () => {
    expect(filterInAction.getIconType(context)).toEqual('plusInCircle');
  });

  describe('isCompatible', () => {
    it('should return true if everything is okay', async () => {
      expect(await filterInAction.isCompatible(context)).toEqual(true);
    });
    it('should return false if field not allowed', async () => {
      expect(
        await filterInAction.isCompatible({
          ...context,
          field: { ...context.field, name: 'signal.reason' },
        })
      ).toEqual(false);
    });
  });

  describe('generic scope execution', () => {
    const dataTableContext = {
      ...context,
      metadata: { scopeId: TableId.alertsOnAlertsPage },
    } as SecurityCellActionExecutionContext;

    it('should execute using generic filterManager', async () => {
      await filterInAction.execute(dataTableContext);
      expect(mockFilterManager.addFilters).toHaveBeenCalled();
      expect(
        mockState.timeline.timelineById[TimelineId.active].filterManager?.addFilters
      ).not.toHaveBeenCalled();
    });
  });

  describe('timeline scope execution', () => {
    const timelineContext = {
      ...context,
      metadata: { scopeId: TimelineId.active },
    } as SecurityCellActionExecutionContext;

    it('should execute using timeline filterManager', async () => {
      await filterInAction.execute(timelineContext);
      expect(
        mockState.timeline.timelineById[TimelineId.active].filterManager?.addFilters
      ).toHaveBeenCalled();
      expect(mockFilterManager.addFilters).not.toHaveBeenCalled();
    });

    describe('should execute correctly when negateFilters is provided', () => {
      it('if negateFilters is false, negate should be false (do not exclude)', async () => {
        await filterInAction.execute({
          ...context,
          metadata: {
            negateFilters: false,
          },
        });
        expect(mockFilterManager.addFilters).toHaveBeenCalled();
        // expect(mockCreateFilter).toBeCalledWith(context.field.name, context.field.value, false);
      });

      it('if negateFilters is true, negate should be true (exclude)', async () => {
        await filterInAction.execute({
          ...context,
          metadata: {
            negateFilters: true,
          },
        });
        expect(mockFilterManager.addFilters).toHaveBeenCalled();
        // expect(mockCreateFilter).toBeCalledWith(context.field.name, context.field.value, true);
      });
    });
  });
});
