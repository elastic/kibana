/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useBulkActions, useBulkAddToCaseActions } from './use_bulk_actions';
import { AppMockRenderer, createAppMockRenderer } from '../../test_utils';
import { createCasesServiceMock } from '../index.mock';

jest.mock('./api');
jest.mock('../../../../common/lib/kibana');

describe('bulk action hooks', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  const refresh = jest.fn();
  const clearSelection = jest.fn();
  const open = jest.fn();
  const caseServicesMock = createCasesServiceMock();
  caseServicesMock.helpers.canUseCases = jest.fn().mockReturnValue({ create: true, read: true });

  const addNewCaseMock = (
    caseServicesMock.hooks.useCasesAddToNewCaseFlyout as jest.Mock
  ).mockReturnValue({ open });

  const addExistingCaseMock = (
    caseServicesMock.hooks.useCasesAddToExistingCaseModal as jest.Mock
  ).mockReturnValue({ open });

  describe('useBulkAddToCaseActions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should refetch when calling onSuccess of useCasesAddToNewCaseFlyout', async () => {
      renderHook(
        () => useBulkAddToCaseActions({ casesService: caseServicesMock, refresh, clearSelection }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      addNewCaseMock.mock.calls[0][0].onSuccess();
      expect(refresh).toHaveBeenCalled();
    });

    it('should refetch when calling onSuccess of useCasesAddToExistingCaseModal', async () => {
      renderHook(
        () => useBulkAddToCaseActions({ casesService: caseServicesMock, refresh, clearSelection }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      addExistingCaseMock.mock.calls[0][0].onSuccess();
      expect(refresh).toHaveBeenCalled();
    });

    it('should open the case flyout', async () => {
      const { result } = renderHook(
        () => useBulkAddToCaseActions({ casesService: caseServicesMock, refresh, clearSelection }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      // @ts-expect-error: cases do not need all arguments
      result.current[0].onClick([]);

      expect(caseServicesMock.helpers.groupAlertsByRule).toHaveBeenCalled();
      expect(open).toHaveBeenCalled();
    });

    it('should open the case modal', async () => {
      const { result } = renderHook(
        () => useBulkAddToCaseActions({ casesService: caseServicesMock, refresh, clearSelection }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      // @ts-expect-error: cases do not need all arguments
      result.current[1].onClick([]);

      expect(caseServicesMock.helpers.groupAlertsByRule).toHaveBeenCalled();
      expect(open).toHaveBeenCalled();
    });

    it('should not show the bulk actions when the user does not have write access', async () => {
      caseServicesMock.helpers.canUseCases = jest
        .fn()
        .mockReturnValue({ create: false, read: true });

      const { result } = renderHook(
        () => useBulkAddToCaseActions({ casesService: caseServicesMock, refresh, clearSelection }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      expect(result.current.length).toBe(0);
    });

    it('should not show the bulk actions when the user does not have read access', async () => {
      caseServicesMock.helpers.canUseCases = jest
        .fn()
        .mockReturnValue({ create: true, read: false });

      const { result } = renderHook(
        () => useBulkAddToCaseActions({ casesService: caseServicesMock, refresh, clearSelection }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      expect(result.current.length).toBe(0);
    });
  });

  describe('useBulkActions', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      caseServicesMock.helpers.canUseCases = jest
        .fn()
        .mockReturnValue({ create: true, read: true });
    });

    it('appends the case bulk actions', async () => {
      const { result } = renderHook(
        () => useBulkActions({ alerts: [], query: {}, casesService: caseServicesMock, refresh }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      expect(result.current.bulkActions).toMatchInlineSnapshot(`
        Array [
          Object {
            "data-test-subj": "attach-new-case",
            "disableOnQuery": true,
            "disabledLabel": "Add to case is not supported for this selection",
            "key": "attach-new-case",
            "label": "Add to new case",
            "onClick": [Function],
          },
          Object {
            "data-test-subj": "attach-existing-case",
            "disableOnQuery": true,
            "disabledLabel": "Add to case is not supported for this selection",
            "key": "attach-existing-case",
            "label": "Add to existing case",
            "onClick": [Function],
          },
        ]
      `);
    });
  });
});
