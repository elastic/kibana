/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellValueContext, EmbeddableInput, IEmbeddable } from '@kbn/embeddable-plugin/public';
import { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/public';
import { createCopyToClipboardLensAction } from './copy_to_clipboard';
import { KibanaServices } from '../../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../../common/constants';
import { Subject } from 'rxjs';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';

jest.mock('../../../../common/lib/kibana');
const currentAppId$ = new Subject<string | undefined>();
KibanaServices.get().application.currentAppId$ = currentAppId$.asObservable();
const mockSuccessToast = jest.fn();
KibanaServices.get().notifications.toasts.addSuccess = mockSuccessToast;

const mockCopy = jest.fn((text: string) => true);
jest.mock('copy-to-clipboard', () => (text: string) => mockCopy(text));

class MockEmbeddable {
  public type;
  constructor(type: string) {
    this.type = type;
  }
  getFilters() {}
  getQuery() {}
}

const columnMeta = {
  field: 'user.name',
  type: 'string' as const,
  source: 'esaggs',
  sourceParams: { indexPatternId: 'some-pattern-id' },
};
const data: CellValueContext['data'] = [{ columnMeta, value: 'the value' }];
const lensEmbeddable = new MockEmbeddable(LENS_EMBEDDABLE_TYPE) as unknown as IEmbeddable;

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
          embeddable: new MockEmbeddable('not_lens') as unknown as IEmbeddable,
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
