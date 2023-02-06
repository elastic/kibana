/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellValueContext, EmbeddableInput, IEmbeddable } from '@kbn/embeddable-plugin/public';
import { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/public';
import type { SecurityAppStore } from '../../../common/store/types';
import { createAddToTimelineAction } from './add_to_timeline';
import { KibanaServices } from '../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../common/constants';
import { Subject } from 'rxjs';
import { TimelineId } from '../../../../common/types';
import { addProvider, showTimeline } from '../../../timelines/store/timeline/actions';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';

jest.mock('../../../common/lib/kibana');
const currentAppId$ = new Subject<string | undefined>();
KibanaServices.get().application.currentAppId$ = currentAppId$.asObservable();
const mockWarningToast = jest.fn();
KibanaServices.get().notifications.toasts.addWarning = mockWarningToast;

const mockDispatch = jest.fn();
const store = {
  dispatch: mockDispatch,
} as unknown as SecurityAppStore;

class MockEmbeddable {
  public type;
  constructor(type: string) {
    this.type = type;
  }
  getFilters() {}
  getQuery() {}
}

const lensEmbeddable = new MockEmbeddable(LENS_EMBEDDABLE_TYPE) as unknown as IEmbeddable;

const columnMeta = {
  field: 'user.name',
  type: 'string' as const,
  source: 'esaggs',
  sourceParams: { indexPatternId: 'some-pattern-id' },
};
const value = 'the value';
const eventId = 'event_1';
const data: CellValueContext['data'] = [{ columnMeta, value, eventId }];

const context = {
  data,
  embeddable: lensEmbeddable,
} as unknown as ActionExecutionContext<CellValueContext>;

describe('Lens createAddToTimelineAction', () => {
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
    it('should return false if error embeddable', async () => {
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          embeddable: new ErrorEmbeddable('some error', {} as EmbeddableInput),
        })
      ).toEqual(false);
    });

    it('should return false if not lens embeddable', async () => {
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          embeddable: new MockEmbeddable('not_lens') as unknown as IEmbeddable,
        })
      ).toEqual(false);
    });

    it('should return false if data is empty', async () => {
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          data: [],
        })
      ).toEqual(false);
    });

    it('should return false if data do not have column meta', async () => {
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          data: [{}],
        })
      ).toEqual(false);
    });

    it('should return false if data column meta do not have field', async () => {
      const { field, ...testColumnMeta } = columnMeta;
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          data: [{ columnMeta: testColumnMeta }],
        })
      ).toEqual(false);
    });

    it('should return false if data column meta field is blacklisted', async () => {
      const testColumnMeta = { ...columnMeta, field: 'signal.reason' };
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          data: [{ columnMeta: testColumnMeta }],
        })
      ).toEqual(false);
    });

    it('should return false if data column meta field not filterable', async () => {
      let testColumnMeta = { ...columnMeta, source: '' };
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          data: [{ columnMeta: testColumnMeta }],
        })
      ).toEqual(false);

      testColumnMeta = { ...columnMeta, sourceParams: { indexPatternId: '' } };
      expect(
        await addToTimelineAction.isCompatible({
          ...context,
          data: [{ columnMeta: testColumnMeta }],
        })
      ).toEqual(false);
    });

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
      expect(mockDispatch).toHaveBeenCalledTimes(2);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: addProvider.type,
        payload: {
          id: TimelineId.active,
          providers: [
            {
              and: [],
              enabled: true,
              excluded: false,
              id: 'event-field-default-timeline-1-event_1-user_name-0-the value',
              kqlQuery: '',
              name: 'user.name',
              queryMatch: {
                field: 'user.name',
                operator: ':',
                value: 'the value',
              },
            },
          ],
        },
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: showTimeline.type,
        payload: {
          id: TimelineId.active,
          show: true,
        },
      });
      expect(mockWarningToast).not.toHaveBeenCalled();
    });

    it('should add exclusive provider for empty values', async () => {
      await addToTimelineAction.execute({
        ...context,
        data: [{ columnMeta }],
      });
      expect(mockDispatch).toHaveBeenCalledTimes(2);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: addProvider.type,
        payload: {
          id: TimelineId.active,
          providers: [
            {
              and: [],
              enabled: true,
              excluded: true,
              id: 'empty-value-timeline-1-user_name-0',
              kqlQuery: '',
              name: 'user.name',
              queryMatch: {
                field: 'user.name',
                operator: ':*',
                value: '',
              },
            },
          ],
        },
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: showTimeline.type,
        payload: {
          id: TimelineId.active,
          show: true,
        },
      });
      expect(mockWarningToast).not.toHaveBeenCalled();
    });

    it('should add exclusive provider for count', async () => {
      await addToTimelineAction.execute({
        ...context,
        data: [
          {
            columnMeta: {
              ...columnMeta,
              type: 'number',
              sourceParams: {
                type: 'value_count',
              },
            },
          },
        ],
      });
      expect(mockDispatch).toHaveBeenCalledTimes(2);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: addProvider.type,
        payload: {
          id: TimelineId.active,
          providers: [
            {
              and: [],
              enabled: true,
              excluded: false,
              id: 'value-count-data-provider-timeline-1-user_name',
              kqlQuery: '',
              name: 'user.name',
              queryMatch: {
                field: 'user.name',
                operator: ':*',
                value: '',
              },
            },
          ],
        },
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: showTimeline.type,
        payload: {
          id: TimelineId.active,
          show: true,
        },
      });
      expect(mockWarningToast).not.toHaveBeenCalled();
    });

    it('should show warning if no provider added', async () => {
      await addToTimelineAction.execute({
        ...context,
        data: [],
      });
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockWarningToast).toHaveBeenCalled();
    });

    it('should show warning if no field in the data column meta', async () => {
      await addToTimelineAction.execute({
        ...context,
        data: [{ columnMeta: { ...columnMeta, field: undefined }, value }],
      });
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockWarningToast).toHaveBeenCalled();
    });
  });
});
