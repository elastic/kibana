/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { CaseAttachmentsWithoutOwner } from '../../types';
import type {
  StartAddAttachmentToExistingCaseTransaction,
  StartCreateCaseWithAttachmentsTransaction,
} from './use_cases_transactions';
import {
  useAddAttachmentToExistingCaseTransaction,
  useCreateCaseWithAttachmentsTransaction,
} from './use_cases_transactions';

const mockAddLabels = jest.fn();
const mockStartTransaction = jest.fn(() => ({ addLabels: mockAddLabels }));
jest.mock('./use_start_transaction', () => ({
  useStartTransaction: () => ({
    startTransaction: mockStartTransaction,
  }),
}));

const appId = 'testAppId';

const singleAttachments = [
  { type: 'alert', alertId: 'someAlertId' },
] as CaseAttachmentsWithoutOwner;

const bulkAttachments = [
  { type: 'alert', alertId: ['someAlertId', 'someAlertId2'] },
  { type: 'alert', alertId: ['someAlertId3'] },
  { type: 'user', comment: 'someComment' },
] as CaseAttachmentsWithoutOwner;

const renderUseCreateCaseWithAttachmentsTransaction = () =>
  renderHook<void, { startTransaction: StartCreateCaseWithAttachmentsTransaction }>(
    useCreateCaseWithAttachmentsTransaction
  );

const renderUseAddAttachmentToExistingCaseTransaction = () =>
  renderHook<void, { startTransaction: StartAddAttachmentToExistingCaseTransaction }>(
    useAddAttachmentToExistingCaseTransaction
  );

describe('cases transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useCreateCaseWithAttachmentsTransaction', () => {
    it('should call createCase transaction', () => {
      const { result } = renderUseCreateCaseWithAttachmentsTransaction();

      result.current.startTransaction({ appId });

      expect(mockStartTransaction).toHaveBeenCalledWith(`Cases [${appId}] createCase`);
      expect(mockAddLabels).not.toHaveBeenCalled();
    });

    it('should call addAttachmentToNewCase transaction', () => {
      const { result } = renderUseCreateCaseWithAttachmentsTransaction();

      result.current.startTransaction({ appId, attachments: singleAttachments });

      expect(mockStartTransaction).toHaveBeenCalledWith(`Cases [${appId}] addAttachmentToNewCase`);
      expect(mockAddLabels).not.toHaveBeenCalled();
    });

    it('should call bulkAddAttachmentsToNewCase transaction', () => {
      const { result } = renderUseCreateCaseWithAttachmentsTransaction();

      result.current.startTransaction({ appId, attachments: bulkAttachments });

      expect(mockStartTransaction).toHaveBeenCalledWith(
        `Cases [${appId}] bulkAddAttachmentsToNewCase`
      );
      expect(mockAddLabels).toHaveBeenCalledWith({ alert_count: 3 });
    });

    it('should not start any transactions if the app ID is not defined', () => {
      const { result } = renderUseCreateCaseWithAttachmentsTransaction();

      result.current.startTransaction();

      expect(mockStartTransaction).not.toHaveBeenCalled();
      expect(mockAddLabels).not.toHaveBeenCalled();
    });
  });

  describe('useAddAttachmentToExistingCaseTransaction', () => {
    it('should call addAttachmentToExistingCase transaction', () => {
      const { result } = renderUseAddAttachmentToExistingCaseTransaction();

      result.current.startTransaction({ appId, attachments: singleAttachments });

      expect(mockStartTransaction).toHaveBeenCalledWith(
        `Cases [${appId}] addAttachmentToExistingCase`
      );
      expect(mockAddLabels).not.toHaveBeenCalled();
    });

    it('should call bulkAddAttachmentsToExistingCase transaction', () => {
      const { result } = renderUseAddAttachmentToExistingCaseTransaction();

      result.current.startTransaction({ appId, attachments: bulkAttachments });

      expect(mockStartTransaction).toHaveBeenCalledWith(
        `Cases [${appId}] bulkAddAttachmentsToExistingCase`
      );
      expect(mockAddLabels).toHaveBeenCalledWith({ alert_count: 3 });
    });

    it('should not start any transactions if the app ID is not defined', () => {
      const { result } = renderUseAddAttachmentToExistingCaseTransaction();

      result.current.startTransaction({ attachments: bulkAttachments });

      expect(mockStartTransaction).not.toHaveBeenCalled();
      expect(mockAddLabels).not.toHaveBeenCalled();
    });
  });
});
