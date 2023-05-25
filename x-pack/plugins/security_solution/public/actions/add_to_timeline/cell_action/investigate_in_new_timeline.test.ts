/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAppStore } from '../../../common/store/types';
import { TimelineId } from '../../../../common/types';
import { addProvider, showTimeline } from '../../../timelines/store/timeline/actions';
import { createInvestigateInNewTimelineCellActionFactory } from './investigate_in_new_timeline';
import type { CellActionExecutionContext } from '@kbn/cell-actions';
import { GEO_FIELD_TYPE } from '../../../timelines/components/timeline/body/renderers/constants';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { timelineActions } from '../../../timelines/store/timeline';

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

const defaultAddProviderAction = {
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

describe('createAddToNewTimelineCellAction', () => {
  const addToTimelineCellActionFactory = createInvestigateInNewTimelineCellActionFactory({
    store,
    services,
  });
  const addToTimelineAction = addToTimelineCellActionFactory({ id: 'testAddToTimeline', order: 1 });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(addToTimelineAction.getDisplayName(context)).toEqual('Investigate in timeline');
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
      expect(mockDispatch).toHaveBeenCalledWith(defaultAddProviderAction);
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
        expect(mockDispatch).toHaveBeenCalledWith(defaultAddProviderAction);
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
          ...defaultAddProviderAction,
          payload: {
            ...defaultAddProviderAction.payload,
            providers: [{ ...defaultAddProviderAction.payload.providers[0], excluded: true }],
          },
        });
        expect(mockWarningToast).not.toHaveBeenCalled();
      });
    });

    it('should clear the timeline', async () => {
      await addToTimelineAction.execute(context);
      expect(mockDispatch.mock.calls[0][0].type).toEqual(timelineActions.createTimeline.type);
    });

    it('should add the providers to the timeline', async () => {
      await addToTimelineAction.execute({
        ...context,
        metadata: {
          andFilters: [{ field: 'kibana.alert.severity', value: 'low' }],
        },
      });

      expect(mockDispatch).toBeCalledWith({
        ...defaultAddProviderAction,
        payload: {
          ...defaultAddProviderAction.payload,
          providers: [
            {
              ...defaultAddProviderAction.payload.providers[0],
              id: 'event-field-default-timeline-1-user_name-0-the-value',
              queryMatch: defaultAddProviderAction.payload.providers[0].queryMatch,
              and: [
                {
                  enabled: true,
                  excluded: false,
                  id: 'event-field-default-timeline-1-kibana_alert_severity-0-low',
                  kqlQuery: '',
                  name: 'kibana.alert.severity',
                  queryMatch: {
                    field: 'kibana.alert.severity',
                    operator: ':',
                    value: 'low',
                  },
                  and: [],
                },
              ],
            },
          ],
        },
      });
    });

    it('should open the timeline', async () => {
      await addToTimelineAction.execute({
        ...context,
        metadata: {
          andFilters: [{ field: 'kibana.alert.severity', value: 'low' }],
        },
      });

      expect(mockDispatch).toBeCalledWith({
        type: showTimeline.type,
        payload: {
          id: TimelineId.active,
          show: true,
        },
      });
    });
  });
});
