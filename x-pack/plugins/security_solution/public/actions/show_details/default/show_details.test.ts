/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAppStore } from '../../../common/store/types';
import { TimelineId, TimelineTabs } from '../../../../common/types';
import { toggleDetailPanel } from '../../../timelines/store/timeline/actions';
import { createDefaultShowDetailsAction } from './show_details';
import type { CellActionExecutionContext } from '@kbn/cell-actions';
import { activeTimeline } from '../../../timelines/containers/active_timeline_context';

const mockDispatch = jest.fn();
const store = {
  dispatch: mockDispatch,
} as unknown as SecurityAppStore;

const mockToggleExpandedDetail = jest.fn();
activeTimeline.toggleExpandedDetail = mockToggleExpandedDetail;

const value = 'the-value';

const context = {
  field: { name: 'user.name', value, type: 'text' },
  metadata: { scopeId: TimelineId.active, timelineTab: TimelineTabs.query },
} as unknown as CellActionExecutionContext;

describe('Default createDefaultShowDetailsAction', () => {
  const showDetailsAction = createDefaultShowDetailsAction({ store, order: 1 });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(showDetailsAction.getDisplayName(context)).toEqual('View user details');
  });

  it('should return icon type', () => {
    expect(showDetailsAction.getIconType(context)).toEqual('expand');
  });

  describe('isCompatible', () => {
    it('should return false if no scopeId', async () => {
      expect(await showDetailsAction.isCompatible({ ...context, metadata: {} })).toEqual(false);
    });

    it('should return false if field does not have detail', async () => {
      expect(
        await showDetailsAction.isCompatible({
          ...context,
          field: { ...context.field, name: 'agent.type' },
        })
      ).toEqual(false);
    });

    it.each(['user.name', 'host.name', 'source.ip', 'destination.ip'])(
      'should return true when field is %s',
      async (fieldName) => {
        expect(
          await showDetailsAction.isCompatible({
            ...context,
            field: { ...context.field, name: fieldName },
          })
        ).toEqual(true);
      }
    );
  });

  describe('execute', () => {
    it('should not execute if no scopeId', async () => {
      await showDetailsAction.execute({ ...context, metadata: {} });
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockToggleExpandedDetail).not.toHaveBeenCalled();
    });

    it('should not execute if no value', async () => {
      await showDetailsAction.execute({
        ...context,
        field: { ...context.field, value: undefined },
      });
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockToggleExpandedDetail).not.toHaveBeenCalled();
    });

    it('should not execute if field does not have detail', async () => {
      await showDetailsAction.execute({
        ...context,
        field: { ...context.field, name: 'agent.type' },
      });
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockToggleExpandedDetail).not.toHaveBeenCalled();
    });

    it('should execute normally', async () => {
      await showDetailsAction.execute(context);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: toggleDetailPanel.type,
        payload: {
          id: TimelineId.active,
          tabType: TimelineTabs.query,
          panelView: 'userDetail',
          params: {
            userName: value,
          },
        },
      });
      expect(mockToggleExpandedDetail).toHaveBeenCalledWith({
        panelView: 'userDetail',
        params: {
          userName: value,
        },
      });
    });
  });
});
