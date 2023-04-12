/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAppStore } from '../../../common/store/types';
import { TimelineId } from '../../../../common/types';
import { addProvider } from '../../../timelines/store/timeline/actions';
import { createAddToTimelineCellActionFactory, getToastMessage } from './add_to_timeline';
import type { CellActionExecutionContext } from '@kbn/cell-actions';
import { GEO_FIELD_TYPE } from '../../../timelines/components/timeline/body/renderers/constants';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';

const mockId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
}));
const services = createStartServicesMock();
const mockWarningToast = services.notifications.toasts.addWarning;

const mockDispatch = jest.fn();
const store = {
  dispatch: mockDispatch,
} as unknown as SecurityAppStore;

const value = 'the-value';

const context = {
  field: { name: 'user.name', value, type: 'text' },
} as CellActionExecutionContext;

const defaultDataProvider = {
  type: addProvider.type,
  payload: {
    id: TimelineId.active,
    providers: [
      {
        and: [],
        enabled: true,
        excluded: false,
        id: 'event-field-default-timeline-1-user_name-0-the-value',
        kqlQuery: '',
        name: 'user.name',
        queryMatch: {
          field: 'user.name',
          operator: ':',
          value: 'the-value',
        },
      },
    ],
  },
};

describe('createAddToTimelineCellAction', () => {
  const addToTimelineCellActionFactory = createAddToTimelineCellActionFactory({ store, services });
  const addToTimelineAction = addToTimelineCellActionFactory({ id: 'testAddToTimeline', order: 1 });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(addToTimelineAction.getDisplayName(context)).toEqual('Add to timeline');
  });

  it('should return icon type', () => {
    expect(addToTimelineAction.getIconType(context)).toEqual('timeline');
  });

  describe('isCompatible', () => {
    it('should return true if everything is okay', async () => {
      expect(await addToTimelineAction.isCompatible(context)).toEqual(true);
    });
    it('should return false if field not allowed', async () => {
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          field: { ...context.field, name: 'signal.reason' },
        })
      ).toEqual(false);
    });
  });

  describe('execute', () => {
    it('should execute normally', async () => {
      await addToTimelineAction.execute(context);
      expect(mockDispatch).toHaveBeenCalledWith(defaultDataProvider);
      expect(mockWarningToast).not.toHaveBeenCalled();
    });

    it('should show warning if no provider added', async () => {
      await addToTimelineAction.execute({
        ...context,
        field: {
          ...context.field,
          type: GEO_FIELD_TYPE,
        },
      });
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockWarningToast).toHaveBeenCalled();
    });

    describe('should execute correctly when negateFilters is provided', () => {
      it('should not exclude if negateFilters is false', async () => {
        await addToTimelineAction.execute({
          ...context,
          metadata: {
            negateFilters: false,
          },
        });
        expect(mockDispatch).toHaveBeenCalledWith(defaultDataProvider);
        expect(mockWarningToast).not.toHaveBeenCalled();
      });

      it('should exclude if negateFilters is true', async () => {
        await addToTimelineAction.execute({
          ...context,
          metadata: {
            negateFilters: true,
          },
        });
        expect(mockDispatch).toHaveBeenCalledWith({
          ...defaultDataProvider,
          payload: {
            ...defaultDataProvider.payload,
            providers: [{ ...defaultDataProvider.payload.providers[0], excluded: true }],
          },
        });
        expect(mockWarningToast).not.toHaveBeenCalled();
      });
    });

    it('should clear the timeline if andFilters are included', async () => {
      await addToTimelineAction.execute({
        ...context,
        metadata: {
          andFilters: [{ field: 'kibana.alert.severity', value: 'low' }],
        },
      });

      expect(mockDispatch.mock.calls[0][0].type).toEqual(
        'x-pack/security_solution/local/timeline/CREATE_TIMELINE'
      );

      expect(mockDispatch.mock.calls[1][0]).toEqual({
        ...defaultDataProvider,
        payload: {
          ...defaultDataProvider.payload,
          providers: [
            {
              ...defaultDataProvider.payload.providers[0],
              id: mockId,
              queryMatch: {
                ...defaultDataProvider.payload.providers[0].queryMatch,
                displayValue: 'the-value',
              },
              and: [
                {
                  enabled: true,
                  excluded: false,
                  id: mockId,
                  kqlQuery: '',
                  name: 'kibana.alert.severity',
                  queryMatch: {
                    displayValue: 'low',
                    field: 'kibana.alert.severity',
                    operator: ':',
                    value: 'low',
                  },
                },
              ],
            },
          ],
        },
      });
    });
  });

  describe('getToastMessage', () => {
    it('handles empty input', () => {
      const result = getToastMessage([], null);
      expect(result).toEqual('');
    });
    it('handles array input', () => {
      const result = getToastMessage([], ['hello', 'world']);
      expect(result).toEqual('hello, world');
    });

    it('handles single filter', () => {
      const result = getToastMessage(
        [{ field: 'kibana.alert.severity', value: 'critical' }],
        value
      );
      expect(result).toEqual(`critical alerts from ${value}`);
    });

    it('handles multiple filters', () => {
      const result = getToastMessage(
        [
          { field: 'kibana.alert.severity', value: 'critical' },
          { field: 'kibana.alert.workflow_status', value: 'open' },
        ],
        value
      );
      expect(result).toEqual(`critical, open alerts from ${value}`);
    });

    it('ignores unrelated filters', () => {
      const result = getToastMessage(
        [
          { field: 'kibana.alert.severity', value: 'critical' },
          { field: 'kibana.alert.workflow_status', value: 'open' },
          // currently only supporting the above fields
          { field: 'user.name', value: 'something' },
        ],
        value
      );
      expect(result).toEqual(`critical, open alerts from ${value}`);
    });

    it('returns entity only when unrelated filters are passed', () => {
      const result = getToastMessage([{ field: 'user.name', value: 'something' }], value);
      expect(result).toEqual(`${value} alerts`);
    });

    it('returns entity only when no filters are passed', () => {
      const result = getToastMessage([], value);
      expect(result).toEqual(`${value} alerts`);
    });

    it('returns entity only when wildcard filters are passed', () => {
      const result = getToastMessage(
        [
          { field: 'kibana.alert.severity', value: '*' },
          { field: 'kibana.alert.workflow_status', value: '*' },
        ],
        value
      );
      expect(result).toEqual(`${value} alerts`);
    });
  });
});
