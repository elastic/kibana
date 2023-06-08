/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAppStore } from '../../../common/store/types';
import { TimelineId } from '../../../../common/types';
import { addProvider } from '../../../timelines/store/timeline/actions';
import { createAddToTimelineCellActionFactory } from './add_to_timeline';
import type { CellActionExecutionContext } from '@kbn/cell-actions';
import { GEO_FIELD_TYPE } from '../../../timelines/components/timeline/body/renderers/constants';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { set } from 'lodash/fp';

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
};

const defaultDataProviderAction = {
  type: addProvider.type,
  payload: {
    id: TimelineId.active,
    providers: [defaultDataProvider],
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
    it('should execute with default value', async () => {
      await addToTimelineAction.execute(context);
      expect(mockDispatch).toHaveBeenCalledWith(defaultDataProviderAction);
      expect(mockWarningToast).not.toHaveBeenCalled();
    });

    it('should execute with null value', async () => {
      await addToTimelineAction.execute({
        field: { name: 'user.name', value: null, type: 'text' },
      } as CellActionExecutionContext);
      expect(mockDispatch).toHaveBeenCalledWith(
        set(
          'payload.providers[0]',
          {
            ...defaultDataProvider,
            id: 'empty-value-timeline-1-user_name-0',
            excluded: true,
            queryMatch: {
              field: 'user.name',
              value: '',
              operator: ':*',
            },
          },
          defaultDataProviderAction
        )
      );
      expect(mockWarningToast).not.toHaveBeenCalled();
    });

    it('should execute with multiple values', async () => {
      const value2 = 'value2';
      const value3 = 'value3';
      await addToTimelineAction.execute({
        field: { name: 'user.name', value: [value, value2, value3], type: 'text' },
      } as CellActionExecutionContext);
      expect(mockDispatch).toHaveBeenCalledWith(
        set(
          'payload.providers[0]',
          {
            ...defaultDataProvider,
            and: [
              {
                ...defaultDataProvider,
                id: 'event-field-default-timeline-1-user_name-0-value2',
                queryMatch: { ...defaultDataProvider.queryMatch, value: value2 },
              },
              {
                ...defaultDataProvider,
                id: 'event-field-default-timeline-1-user_name-0-value3',
                queryMatch: { ...defaultDataProvider.queryMatch, value: value3 },
              },
            ],
          },
          defaultDataProviderAction
        )
      );
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
        expect(mockDispatch).toHaveBeenCalledWith(defaultDataProviderAction);
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
          ...defaultDataProviderAction,
          payload: {
            ...defaultDataProviderAction.payload,
            providers: [{ ...defaultDataProviderAction.payload.providers[0], excluded: true }],
          },
        });
        expect(mockWarningToast).not.toHaveBeenCalled();
      });
    });
  });
});
