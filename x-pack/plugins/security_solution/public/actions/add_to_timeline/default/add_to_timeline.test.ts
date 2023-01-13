/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAppStore } from '../../../common/store/types';
import { KibanaServices } from '../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../common/constants';
import { Subject } from 'rxjs';
import { TimelineId } from '../../../../common/types';
import { addProvider } from '../../../timelines/store/timeline/actions';
import { createAddToTimelineAction } from './add_to_timeline';
import type { CellActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { GEO_FIELD_TYPE } from '../../../timelines/components/timeline/body/renderers/constants';

jest.mock('../../../common/lib/kibana');
const currentAppId$ = new Subject<string | undefined>();
KibanaServices.get().application.currentAppId$ = currentAppId$.asObservable();
const mockWarningToast = jest.fn();
KibanaServices.get().notifications.toasts.addWarning = mockWarningToast;

const mockDispatch = jest.fn();
const store = {
  dispatch: mockDispatch,
} as unknown as SecurityAppStore;

const value = 'the-value';

const context = {
  field: { name: 'user.name', value, type: 'text' },
} as CellActionExecutionContext;

describe('Default createAddToTimelineAction', () => {
  const addToTimelineAction = createAddToTimelineAction({ store, order: 1 });

  beforeEach(() => {
    currentAppId$.next(APP_UI_ID);
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(addToTimelineAction.getDisplayName(context)).toEqual('Add to timeline');
  });

  it('should return icon type', () => {
    expect(addToTimelineAction.getIconType(context)).toEqual('timeline');
  });

  describe('isCompatible', () => {
    it('should return false if not in Security', async () => {
      currentAppId$.next('not security');
      expect(await addToTimelineAction.isCompatible(context)).toEqual(false);
    });

    it('should return true if everything is okay', async () => {
      expect(await addToTimelineAction.isCompatible(context)).toEqual(true);
    });
  });

  describe('execute', () => {
    it('should execute normally', async () => {
      await addToTimelineAction.execute(context);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: addProvider.type,
        payload: {
          id: TimelineId.active,
          providers: [
            {
              and: [],
              enabled: true,
              excluded: false,
              id: 'event-details-value-default-draggable-timeline-1-user_name-0-the-value',
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
      });
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
  });
});
