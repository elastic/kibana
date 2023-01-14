/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../../../common/lib/kibana';
import { createCopyToClipboardAction } from './copy_to_clipboard';
import type { CellActionExecutionContext } from '@kbn/ui-actions-plugin/public';

jest.mock('../../../common/lib/kibana');
const mockSuccessToast = jest.fn();
KibanaServices.get().notifications.toasts.addSuccess = mockSuccessToast;

const mockCopy = jest.fn((text: string) => true);
jest.mock('copy-to-clipboard', () => (text: string) => mockCopy(text));

describe('Default createCopyToClipboardAction', () => {
  const copyToClipboardAction = createCopyToClipboardAction({ order: 1 });
  const context = {
    field: { name: 'user.name', value: 'the value', type: 'text' },
  } as CellActionExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(copyToClipboardAction.getDisplayName(context)).toEqual('Copy to Clipboard');
  });

  it('should return icon type', () => {
    expect(copyToClipboardAction.getIconType(context)).toEqual('copyClipboard');
  });

  describe('isCompatible', () => {
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
  });
});
