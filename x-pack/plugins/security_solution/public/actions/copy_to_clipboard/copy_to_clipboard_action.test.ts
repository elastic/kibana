/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellValueContext, EmbeddableInput, IEmbeddable } from '@kbn/embeddable-plugin/public';
import { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/public';
import { CopyToClipboardAction } from './copy_to_clipboard_action';
import { KibanaServices } from '../../common/lib/kibana';
import { APP_UI_ID } from '../../../common/constants';
import { Subject } from 'rxjs';

jest.mock('../../common/lib/kibana');
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

const lensEmbeddable = new MockEmbeddable(LENS_EMBEDDABLE_TYPE) as unknown as IEmbeddable;

const columnMeta = {
  field: 'user.name',
  type: 'string' as const,
  source: 'esaggs',
  sourceParams: { indexPatternId: 'some-pattern-id' },
};
const data: CellValueContext['data'] = [{ columnMeta, value: 'the value' }];

describe('CopyToClipboardAction', () => {
  const addToTimelineAction = new CopyToClipboardAction();

  beforeEach(() => {
    currentAppId$.next(APP_UI_ID);
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(addToTimelineAction.getDisplayName()).toEqual('Copy to clipboard');
  });

  it('should return icon type', () => {
    expect(addToTimelineAction.getIconType()).toEqual('copyClipboard');
  });

  describe('isCompatible', () => {
    it('should return false if error embeddable', async () => {
      expect(
        await addToTimelineAction.isCompatible({
          embeddable: new ErrorEmbeddable('some error', {} as EmbeddableInput),
          data,
        })
      ).toEqual(false);
    });

    it('should return false if not lens embeddable', async () => {
      expect(
        await addToTimelineAction.isCompatible({
          embeddable: new MockEmbeddable('not_lens') as unknown as IEmbeddable,
          data,
        })
      ).toEqual(false);
    });

    it('should return false if data is empty', async () => {
      expect(
        await addToTimelineAction.isCompatible({
          embeddable: lensEmbeddable,
          data: [],
        })
      ).toEqual(false);
    });

    it('should return false if data do not have column meta', async () => {
      expect(
        await addToTimelineAction.isCompatible({
          embeddable: lensEmbeddable,
          data: [{}],
        })
      ).toEqual(false);
    });

    it('should return false if data column meta do not have field', async () => {
      const { field, ...testColumnMeta } = columnMeta;
      expect(
        await addToTimelineAction.isCompatible({
          embeddable: lensEmbeddable,
          data: [{ columnMeta: testColumnMeta }],
        })
      ).toEqual(false);
    });

    it('should return false if data column meta field is blacklisted', async () => {
      const testColumnMeta = { ...columnMeta, field: 'signal.reason' };
      expect(
        await addToTimelineAction.isCompatible({
          embeddable: lensEmbeddable,
          data: [{ columnMeta: testColumnMeta }],
        })
      ).toEqual(false);
    });

    it('should return false if not in Security', async () => {
      currentAppId$.next('not security');
      expect(
        await addToTimelineAction.isCompatible({
          embeddable: lensEmbeddable,
          data,
        })
      ).toEqual(false);
    });

    it('should return true if everything is okay', async () => {
      expect(
        await addToTimelineAction.isCompatible({
          embeddable: lensEmbeddable,
          data,
        })
      ).toEqual(true);
    });
  });

  describe('execute', () => {
    it('should execute normally', async () => {
      await addToTimelineAction.execute({
        embeddable: lensEmbeddable,
        data,
      });
      expect(mockCopy).toHaveBeenCalledWith('user.name: "the value"');
      expect(mockSuccessToast).toHaveBeenCalled();
    });

    it('should execute with multiple values', async () => {
      await addToTimelineAction.execute({
        embeddable: lensEmbeddable,
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

    it('should show warning if no provider added', async () => {
      mockCopy.mockReturnValue(false);
      await addToTimelineAction.execute({
        embeddable: lensEmbeddable,
        data: [],
      });
      expect(mockSuccessToast).not.toHaveBeenCalled();
    });
  });
});
