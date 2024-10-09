/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Adapters,
  CellValueContext,
  EmbeddableInput,
  FilterableEmbeddable,
  IEmbeddable,
} from '@kbn/embeddable-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import type { LensApi } from '@kbn/lens-plugin/public';
import { createCopyToClipboardLensAction } from './copy_to_clipboard';
import { KibanaServices } from '../../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../../common/constants';
import { BehaviorSubject, Subject } from 'rxjs';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { Query, Filter, AggregateQuery, TimeRange } from '@kbn/es-query';
import type { PhaseEvent } from '@kbn/presentation-publishing';

jest.mock('../../../../common/lib/kibana');
const currentAppId$ = new Subject<string | undefined>();
KibanaServices.get().application.currentAppId$ = currentAppId$.asObservable();
const mockSuccessToast = jest.fn();
KibanaServices.get().notifications.toasts.addSuccess = mockSuccessToast;

const mockCopy = jest.fn((text: string) => true);
jest.mock('copy-to-clipboard', () => (text: string) => mockCopy(text));

const getMockLensApi = (
  { from, to = 'now' }: { from: string; to: string } = { from: 'now-24h', to: 'now' }
): LensApi & FilterableEmbeddable => ({
  // Static props
  type: 'lens',
  uuid: '1234',
  // Shared Embeddable Observables
  panelTitle: new BehaviorSubject<string | undefined>('myPanel'),
  hidePanelTitle: new BehaviorSubject<boolean | undefined>(false),
  filters$: new BehaviorSubject<Filter[] | undefined>([]),
  query$: new BehaviorSubject<Query | AggregateQuery | undefined>({
    query: 'test',
    language: 'kuery',
  }),
  timeRange$: new BehaviorSubject<TimeRange | undefined>({ from, to }),
  dataLoading: new BehaviorSubject<boolean | undefined>(false),
  // Methods
  getSavedVis: jest.fn(),
  getFullAttributes: jest.fn(),
  canViewUnderlyingData: jest.fn(async () => true),
  getViewUnderlyingDataArgs: jest.fn(() => ({
    dataViewSpec: { id: 'index-pattern-id' },
    timeRange: { from: 'now-7d', to: 'now' },
    filters: [],
    query: undefined,
    columns: [],
  })),
  isTextBasedLanguage: jest.fn(() => true),
  getTextBasedLanguage: jest.fn(),
  getInspectorAdapters: jest.fn(() => ({})),
  inspect: jest.fn(),
  closeInspector: jest.fn(async () => {}),
  supportedTriggers: jest.fn(() => []),
  canLinkToLibrary: jest.fn(async () => false),
  canUnlinkFromLibrary: jest.fn(async () => false),
  unlinkFromLibrary: jest.fn(),
  checkForDuplicateTitle: jest.fn(),
  /** New embeddable api inherited methods */
  resetUnsavedChanges: jest.fn(),
  serializeState: jest.fn(),
  snapshotRuntimeState: jest.fn(),
  saveToLibrary: jest.fn(async () => 'saved-id'),
  getByValueRuntimeSnapshot: jest.fn(),
  onEdit: jest.fn(),
  isEditingEnabled: jest.fn(() => true),
  getTypeDisplayName: jest.fn(() => 'Lens'),
  setPanelTitle: jest.fn(),
  setHidePanelTitle: jest.fn(),
  phase$: new BehaviorSubject<PhaseEvent | undefined>({
    id: '1111',
    status: 'rendered',
    timeToEvent: 1000,
  }),
  unsavedChanges: new BehaviorSubject<object | undefined>(undefined),
  dataViews: new BehaviorSubject<DataView[] | undefined>(undefined),
  libraryId$: new BehaviorSubject<string | undefined>(undefined),
  savedObjectId: new BehaviorSubject<string | undefined>(undefined),
  adapters$: new BehaviorSubject<Adapters>({}),
  updateAttributes: jest.fn(),
  updateSavedObjectId: jest.fn(),
  updateOverrides: jest.fn(),

  // make it pass the isFilterable check for now
  getFilters: jest.fn(),
  getQuery: jest.fn(),
});

const getMockEmbeddable = (type: string): IEmbeddable =>
  ({
    type,
    getFilters: jest.fn(),
    getQuery: jest.fn(),
  } as unknown as IEmbeddable);

const lensEmbeddable = getMockLensApi();

const columnMeta = {
  field: 'user.name',
  type: 'string' as const,
  source: 'esaggs',
  sourceParams: { indexPatternId: 'some-pattern-id' },
};
const data: CellValueContext['data'] = [{ columnMeta, value: 'the value' }];

const context = {
  data,
  embeddable: lensEmbeddable,
} as unknown as ActionExecutionContext<CellValueContext>;

describe('createCopyToClipboardLensAction', () => {
  const copyToClipboardAction = createCopyToClipboardLensAction({ order: 1 });

  beforeEach(() => {
    currentAppId$.next(APP_UI_ID);
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(copyToClipboardAction.getDisplayName(context)).toEqual('Copy to Clipboard');
  });

  it('should return icon type', () => {
    expect(copyToClipboardAction.getIconType(context)).toEqual('copyClipboard');
  });

  describe('isCompatible', () => {
    it('should return false if error embeddable', async () => {
      expect(
        await copyToClipboardAction.isCompatible({
          ...context,
          embeddable: new ErrorEmbeddable('some error', {} as EmbeddableInput),
        })
      ).toEqual(false);
    });

    it('should return false if not lens embeddable', async () => {
      expect(
        await copyToClipboardAction.isCompatible({
          ...context,
          embeddable: getMockEmbeddable('not_lens') as unknown as IEmbeddable,
        })
      ).toEqual(false);
    });

    it('should return false if data is empty', async () => {
      expect(
        await copyToClipboardAction.isCompatible({
          ...context,
          data: [],
        })
      ).toEqual(false);
    });

    it('should return false if data do not have column meta', async () => {
      expect(
        await copyToClipboardAction.isCompatible({
          ...context,

          data: [{}],
        })
      ).toEqual(false);
    });

    it('should return false if data column meta do not have field', async () => {
      const { field, ...testColumnMeta } = columnMeta;
      expect(
        await copyToClipboardAction.isCompatible({
          ...context,
          data: [{ columnMeta: testColumnMeta }],
        })
      ).toEqual(false);
    });

    it('should return false if data column meta field is blacklisted', async () => {
      const testColumnMeta = { ...columnMeta, field: 'signal.reason' };
      expect(
        await copyToClipboardAction.isCompatible({
          ...context,
          data: [{ columnMeta: testColumnMeta }],
        })
      ).toEqual(false);
    });

    it('should return false if not in Security', async () => {
      currentAppId$.next('not security');
      expect(await copyToClipboardAction.isCompatible(context)).toEqual(false);
    });

    it('should return true if everything is okay', async () => {
      expect(await copyToClipboardAction.isCompatible(context)).toEqual(true);
    });
  });

  describe('execute', () => {
    it('should execute normally', async () => {
      await copyToClipboardAction.execute(context);
      expect(mockCopy).toHaveBeenCalledWith('user.name: "the value"');
      expect(mockSuccessToast).toHaveBeenCalled();
    });

    it('should handle number coming from value count', async () => {
      await copyToClipboardAction.execute({
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
      expect(mockCopy).toHaveBeenCalledWith('user.name: *');
      expect(mockSuccessToast).toHaveBeenCalled();
    });

    it('should execute with multiple values', async () => {
      await copyToClipboardAction.execute({
        ...context,
        data: [
          ...data,
          { columnMeta: { ...columnMeta, field: 'host.name' }, value: 'host name value' },
        ],
      });
      expect(mockCopy).toHaveBeenCalledWith(
        'user.name: "the value" | host.name: "host name value"'
      );
      expect(mockSuccessToast).toHaveBeenCalled();
    });

    it('should not show success message if no provider added', async () => {
      mockCopy.mockReturnValue(false);
      await copyToClipboardAction.execute({
        ...context,
        data: [],
      });
      expect(mockSuccessToast).not.toHaveBeenCalled();
    });
  });
});
